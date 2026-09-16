import type { DocumentRepository } from '../repositories/document.repository';
import type { AgentRepository } from '../repositories/agent.repository';

export interface RetrievedChunk {
  titulo: string;
  contenido: string;
  score?: number;
  origen: 'vectorial' | 'lexico';
  vectorId?: string;
}

export class RagService {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly agentRepo: AgentRepository,
    private readonly ai?: Ai,
    private readonly vectorIndex?: VectorizeIndex
  ) {}

  /**
   * Split markdown text into logical chunks by headers (## )
   */
  splitMarkdownIntoSections(markdown: string): { titulo: string; contenido: string }[] {
    const lines = markdown.split('\n');
    const sections: { titulo: string; contenido: string }[] = [];
    let currentTitle = 'Introducción';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (currentContent.length > 0) {
          sections.push({
            titulo: currentTitle,
            contenido: currentContent.join('\n').trim()
          });
          currentContent = [];
        }
        currentTitle = line.replace(/^#+\s*/, '').trim();
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        titulo: currentTitle,
        contenido: currentContent.join('\n').trim()
      });
    }

    return sections.filter((s) => s.contenido.length > 0);
  }

  /**
   * Ingest a markdown file for an agent: chunks, embeddings, Vectorize and D1 (FTS5)
   */
  async ingestDocument(agenteId: number, nombreArchivo: string, contenido: string) {
    const sections = this.splitMarkdownIntoSections(contenido);
    const results = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]!;
      const vectorId = `agent-${agenteId}-${Date.now()}-${i}`;
      let vectorGenerated = false;

      // 1. Generate embeddings and store in Vectorize if available
      if (this.ai && this.vectorIndex) {
        try {
          const aiResponse: any = await this.ai.run('@cf/baai/bge-m3' as any, {
            text: [section.contenido]
          });
          const vector = aiResponse?.data?.[0];

          if (vector && Array.isArray(vector)) {
            await this.vectorIndex.upsert([
              {
                id: vectorId,
                values: vector,
                metadata: {
                  agente_id: String(agenteId),
                  titulo: section.titulo,
                  archivo: nombreArchivo
                }
              }
            ]);
            vectorGenerated = true;
          }
        } catch (err) {
          console.warn('[RAG] Fallback: Vectorize/AI embedding generation skipped or simulated in local environment', err);
        }
      }

      // 2. Persist in D1 (triggers automatic FTS5 sync)
      const inserted = await this.docRepo.insertChunk({
        agenteId,
        vectorId: vectorGenerated ? vectorId : `local-${Date.now()}-${i}`,
        nombreArchivo,
        tituloSeccion: section.titulo,
        contenido: section.contenido
      });

      results.push(inserted);
    }

    return {
      success: true,
      chunksIngested: results.length,
      sections: results.map((r) => r?.tituloSeccion)
    };
  }

  /**
   * Hybrid retrieval: Vectorize semantic search + D1 FTS5 lexical search
   */
  async retrieveContext(agenteId: number, pregunta: string): Promise<RetrievedChunk[]> {
    const chunks: RetrievedChunk[] = [];
    const seenTitles = new Set<string>();

    // 1. Semantic search with Vectorize
    if (this.ai && this.vectorIndex) {
      try {
        const queryEmbed: any = await this.ai.run('@cf/baai/bge-m3' as any, {
          text: [pregunta]
        });
        const queryVector = queryEmbed?.data?.[0];

        if (queryVector && Array.isArray(queryVector)) {
          const vectorMatches = await this.vectorIndex.query(queryVector, {
            topK: 3
          });

          if (vectorMatches?.matches) {
            for (const match of vectorMatches.matches) {
              const meta = match.metadata as any;
              // Filter by agent if metadata has it
              if (meta && (!meta.agente_id || meta.agente_id === String(agenteId))) {
                const title = meta.titulo || 'Fragmento Constitucional';
                seenTitles.add(title);
                chunks.push({
                  titulo: title,
                  contenido: meta.contenido || `Referencia a ${title} (Score: ${match.score?.toFixed(4)})`,
                  score: match.score,
                  origen: 'vectorial',
                  vectorId: match.id
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[RAG] Semantic vector query skipped or local fallback:', err);
      }
    }

    // 2. Lexical search with D1 FTS5 (always executes and grounds exact articles)
    try {
      const ftsMatches = await this.docRepo.searchFts(agenteId, pregunta, 3);
      for (const fts of ftsMatches) {
        if (!seenTitles.has(fts.tituloSeccion)) {
          seenTitles.add(fts.tituloSeccion);
          chunks.push({
            titulo: fts.tituloSeccion,
            contenido: fts.contenido,
            origen: 'lexico'
          });
        }
      }
    } catch (err) {
      console.warn('[RAG] FTS search fallback:', err);
    }

    // 3. If no chunks found yet, retrieve most recent chunks of this agent as grounding context
    if (chunks.length === 0) {
      const recent = await this.docRepo.findByAgentId(agenteId);
      for (const item of recent.slice(0, 2)) {
        chunks.push({
          titulo: item.tituloSeccion,
          contenido: item.contenido,
          origen: 'lexico'
        });
      }
    }

    return chunks;
  }

  /**
   * Execute augmented generation with Workers AI Llama 3.1
   */
  async generateAnswer(agenteId: number, pregunta: string, stream = false) {
    const agent = await this.agentRepo.findById(agenteId);
    if (!agent) {
      throw new Error(`Agente con ID ${agenteId} no encontrado`);
    }

    const contextChunks = await this.retrieveContext(agenteId, pregunta);

    const formattedContext = contextChunks.length > 0
      ? contextChunks.map((c) => `### ${c.titulo}\n${c.contenido}`).join('\n\n')
      : 'No se encontraron artículos específicos en la base documental del agente.';

    const systemPrompt = `${agent.systemPrompt}

Eres un asesor jurídico riguroso especializado en la Constitución Política de Colombia.
Utiliza ÚNICAMENTE el siguiente contexto normativo recuperado para fundamentar tu respuesta:

================ CONTEXTO NORMATIVO ================
${formattedContext}
====================================================

Reglas obligatorias:
1. Cita con precisión el número del artículo o título mencionado en el contexto.
2. Si la respuesta no se encuentra en el contexto, indícalo claramente con cortesía profesional.
3. Sé conciso, didáctico y formal.`;

    // If Workers AI is configured, run model
    if (this.ai) {
      try {
        const modelName = (agent.modelo && agent.modelo !== '@cf/meta/llama-3.1-8b-instruct')
          ? agent.modelo
          : '@cf/meta/llama-4-scout-17b-16e-instruct';

        const response = await this.ai.run(modelName as any, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: pregunta }
          ],
          temperature: agent.temperatura ?? 0.2,
          stream
        });

        return {
          response,
          contextChunks,
          isLiveAI: true
        };
      } catch (err) {
        console.warn('[RAG] Workers AI execution error, falling back to simulated inference:', err);
      }
    }

    // Local deterministic inference fallback (ideal for test environments without Cloudflare token)
    const simulatedAnswer = `De acuerdo con la Constitución Política de Colombia y la base normativa asignada a ${agent.nombre}:\n\n` +
      contextChunks.map((c) => `En relación con **${c.titulo}**: "${c.contenido.substring(0, 280)}..."`).join('\n\n') +
      `\n\nPor tanto, la consulta sobre "${pregunta}" queda fundamentada en las disposiciones constitucionales citadas.`;

    return {
      response: simulatedAnswer,
      contextChunks,
      isLiveAI: false
    };
  }
}
