import { eq, inArray, or, sql } from 'drizzle-orm';
import type { AppDatabase } from '../db';
import * as schema from '../db/schema';

export interface InsertDocumentChunk {
  agenteId?: number | null;
  dominio?: string;
  habilidadId?: number | null;
  vectorId: string;
  nombreArchivo: string;
  tituloSeccion: string;
  contenido: string;
}

export interface FtsSearchResult {
  documentoId: number;
  agenteId?: number | null;
  dominio?: string;
  tituloSeccion: string;
  contenido: string;
}

const SPANISH_STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un',
  'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le',
  'ya', 'o', 'fue', 'este', 'ha', 'sí', 'porque', 'esta', 'son', 'entre', 'está',
  'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien',
  'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros',
  'ese', 'eso', 'ante', 'ellos', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos',
  'otro', 'otras', 'otra', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada',
  'muchos', 'cual', 'cuál', 'cuáles', 'sea', 'poco', 'ella', 'estar', 'haber',
  'estas', 'estaba', 'estamos', 'algunas', 'algo', 'nosotros', 'cómo'
]);

export class DocumentRepository {
  constructor(private readonly db: AppDatabase) {}

  async insertChunk(data: InsertDocumentChunk) {
    const [inserted] = await this.db
      .insert(schema.agenteDocumentos)
      .values({
        agenteId: data.agenteId ?? null,
        dominio: data.dominio ?? 'transversal',
        habilidadId: data.habilidadId ?? null,
        vectorId: data.vectorId,
        nombreArchivo: data.nombreArchivo,
        tituloSeccion: data.tituloSeccion,
        contenido: data.contenido
      })
      .returning();

    return inserted;
  }

  async insertManyChunks(chunks: InsertDocumentChunk[]) {
    if (chunks.length === 0) return [];
    return this.db
      .insert(schema.agenteDocumentos)
      .values(
        chunks.map((c) => ({
          agenteId: c.agenteId ?? null,
          dominio: c.dominio ?? 'transversal',
          habilidadId: c.habilidadId ?? null,
          vectorId: c.vectorId,
          nombreArchivo: c.nombreArchivo,
          tituloSeccion: c.tituloSeccion,
          contenido: c.contenido
        }))
      )
      .returning();
  }

  async findById(id: number) {
    const [doc] = await this.db
      .select()
      .from(schema.agenteDocumentos)
      .where(eq(schema.agenteDocumentos.id, id))
      .limit(1);
    return doc ?? null;
  }

  async updateChunk(
    id: number,
    data: {
      tituloSeccion?: string | undefined;
      contenido?: string | undefined;
      dominio?: string | undefined;
      habilidadId?: number | null | undefined;
    }
  ) {
    const updateValues: Partial<typeof schema.agenteDocumentos.$inferInsert> = {};
    if (data.tituloSeccion !== undefined) updateValues.tituloSeccion = data.tituloSeccion;
    if (data.contenido !== undefined) updateValues.contenido = data.contenido;
    if (data.dominio !== undefined) updateValues.dominio = data.dominio;
    if (data.habilidadId !== undefined) updateValues.habilidadId = data.habilidadId;

    const [updated] = await this.db
      .update(schema.agenteDocumentos)
      .set(updateValues)
      .where(eq(schema.agenteDocumentos.id, id))
      .returning();

    return updated ?? null;
  }

  async deleteChunk(id: number) {
    const [deleted] = await this.db
      .delete(schema.agenteDocumentos)
      .where(eq(schema.agenteDocumentos.id, id))
      .returning();
    return deleted ?? null;
  }

  async findByAgentId(agenteId: number) {
    return this.db.query.agenteDocumentos.findMany({
      where: eq(schema.agenteDocumentos.agenteId, agenteId)
    });
  }

  async findByDominios(dominios: string[], limit = 10) {
    if (dominios.includes('*')) {
      return this.db.query.agenteDocumentos.findMany({ limit });
    }
    return this.db.query.agenteDocumentos.findMany({
      where: inArray(schema.agenteDocumentos.dominio, dominios),
      limit
    });
  }

  async findRelevantChunks(agenteId: number, dominios: string[] = ['transversal'], limit = 2) {
    if (dominios.includes('*')) {
      return this.db.query.agenteDocumentos.findMany({ limit });
    }

    return this.db.query.agenteDocumentos.findMany({
      where: or(
        eq(schema.agenteDocumentos.agenteId, agenteId),
        inArray(schema.agenteDocumentos.dominio, dominios)
      ),
      limit
    });
  }

  /**
   * Search documents using FTS5 lexical match across agentId and/or authorized domains with BM25 ranking.
   */
  async searchFts(
    agenteId: number,
    rawQuery: string,
    limit = 3,
    dominios: string[] = ['transversal']
  ): Promise<FtsSearchResult[]> {
    // Sanitize query by removing punctuation and filtering Spanish stopwords
    const tokens = rawQuery
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let filteredWords = tokens.filter((w) => !SPANISH_STOPWORDS.has(w));
    if (filteredWords.length === 0) {
      filteredWords = tokens; // fallback if all words were stopwords
    }

    if (filteredWords.length === 0) {
      return [];
    }

    const sanitizedWords = filteredWords.map((w) => `"${w}"*`);
    const ftsQuery = sanitizedWords.join(' OR ');

    try {
      let querySql;
      if (dominios.includes('*')) {
        // Agente general: busca en todo el corpus documental con ranking BM25
        querySql = sql`SELECT documento_id, agente_id, dominio, titulo_seccion, contenido 
            FROM fts_documentos 
            WHERE fts_documentos MATCH ${ftsQuery} 
            ORDER BY bm25(fts_documentos) ASC
            LIMIT ${limit}`;
      } else {
        // Agente especialista: busca por su agenteId O por los dominios autorizados con ranking BM25
        const domainConditions = dominios.map((d) => sql`dominio = ${d}`);
        const domainClause = domainConditions.length > 0 
          ? sql.join(domainConditions, sql` OR `)
          : sql`1=0`;

        querySql = sql`SELECT documento_id, agente_id, dominio, titulo_seccion, contenido 
            FROM fts_documentos 
            WHERE (agente_id = ${agenteId} OR ${domainClause}) 
              AND fts_documentos MATCH ${ftsQuery} 
            ORDER BY bm25(fts_documentos) ASC
            LIMIT ${limit}`;
      }

      const rawResult = await this.db.all<{
        documento_id: number;
        agente_id: number | null;
        dominio: string;
        titulo_seccion: string;
        contenido: string;
      }>(querySql);

      return rawResult.map((r) => ({
        documentoId: r.documento_id,
        agenteId: r.agente_id,
        dominio: r.dominio,
        tituloSeccion: r.titulo_seccion,
        contenido: r.contenido
      }));
    } catch {
      return [];
    }
  }

  async countByAgentId(agenteId: number): Promise<number> {
    const res = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.agenteDocumentos)
      .where(eq(schema.agenteDocumentos.agenteId, agenteId));
    return res[0]?.count ?? 0;
  }
}
