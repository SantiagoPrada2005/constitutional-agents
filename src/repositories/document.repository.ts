import { eq, sql } from 'drizzle-orm';
import type { AppDatabase } from '../db';
import * as schema from '../db/schema';

export interface InsertDocumentChunk {
  agenteId: number;
  vectorId: string;
  nombreArchivo: string;
  tituloSeccion: string;
  contenido: string;
}

export interface FtsSearchResult {
  documentoId: number;
  agenteId: number;
  tituloSeccion: string;
  contenido: string;
}

export class DocumentRepository {
  constructor(private readonly db: AppDatabase) {}

  async insertChunk(data: InsertDocumentChunk) {
    const [inserted] = await this.db
      .insert(schema.agenteDocumentos)
      .values({
        agenteId: data.agenteId,
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
    return this.db.insert(schema.agenteDocumentos).values(chunks).returning();
  }

  async findByAgentId(agenteId: number) {
    return this.db.query.agenteDocumentos.findMany({
      where: eq(schema.agenteDocumentos.agenteId, agenteId)
    });
  }

  /**
   * Search documents using FTS5 lexical match with sanitized queries.
   */
  async searchFts(agenteId: number, rawQuery: string, limit = 3): Promise<FtsSearchResult[]> {
    // Sanitize query by removing SQLite FTS5 syntax control characters
    const sanitizedWords = rawQuery
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => `"${w}"*`);

    if (sanitizedWords.length === 0) {
      return [];
    }

    const ftsQuery = sanitizedWords.join(' OR ');

    try {
      const rawResult = await this.db.all<{
        documento_id: number;
        agente_id: number;
        titulo_seccion: string;
        contenido: string;
      }>(
        sql`SELECT documento_id, agente_id, titulo_seccion, contenido 
            FROM fts_documentos 
            WHERE agente_id = ${agenteId} 
              AND fts_documentos MATCH ${ftsQuery} 
            LIMIT ${limit}`
      );

      return rawResult.map((r) => ({
        documentoId: r.documento_id,
        agenteId: r.agente_id,
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
