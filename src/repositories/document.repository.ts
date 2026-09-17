import { eq, inArray, or, sql } from 'drizzle-orm';
import type { AppDatabase } from '../db';
import * as schema from '../db/schema';

export interface InsertDocument {
  agenteId?: number | null;
  dominio?: string;
  habilidadId?: number | null;
  nombreArchivo: string;
}

export interface InsertDocumentChunk {
  documentoId: number;
  indice?: number;
  tituloSeccion: string;
  contenido: string;
  vectorId: string;
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

  async createDocument(data: InsertDocument) {
    const [inserted] = await this.db
      .insert(schema.documentos)
      .values({
        agenteId: data.agenteId ?? null,
        dominio: data.dominio ?? 'transversal',
        habilidadId: data.habilidadId ?? null,
        nombreArchivo: data.nombreArchivo,
      })
      .returning();

    if (!inserted) {
      throw new Error('No fue posible crear el registro del documento');
    }

    return inserted;
  }

  async insertChunk(data: {
    documentoId: number;
    indice?: number;
    vectorId: string;
    tituloSeccion: string;
    contenido: string;
  }) {
    const [inserted] = await this.db
      .insert(schema.documentoChunks)
      .values({
        documentoId: data.documentoId,
        indice: data.indice ?? 0,
        vectorId: data.vectorId,
        tituloSeccion: data.tituloSeccion,
        contenido: data.contenido,
      })
      .returning();

    return inserted;
  }

  async insertManyChunks(chunks: Array<{
    documentoId: number;
    indice?: number;
    vectorId: string;
    tituloSeccion: string;
    contenido: string;
  }>) {
    if (chunks.length === 0) return [];
    return this.db
      .insert(schema.documentoChunks)
      .values(
        chunks.map((c, i) => ({
          documentoId: c.documentoId,
          indice: c.indice ?? i,
          vectorId: c.vectorId,
          tituloSeccion: c.tituloSeccion,
          contenido: c.contenido,
        }))
      )
      .returning();
  }

  async findChunkById(id: number) {
    const [chunk] = await this.db
      .select({
        id: schema.documentoChunks.id,
        documentoId: schema.documentos.id,
        agenteId: schema.documentos.agenteId,
        dominio: schema.documentos.dominio,
        habilidadId: schema.documentos.habilidadId,
        vectorId: schema.documentoChunks.vectorId,
        nombreArchivo: schema.documentos.nombreArchivo,
        tituloSeccion: schema.documentoChunks.tituloSeccion,
        contenido: schema.documentoChunks.contenido,
        createdAt: schema.documentoChunks.createdAt,
      })
      .from(schema.documentoChunks)
      .innerJoin(schema.documentos, eq(schema.documentoChunks.documentoId, schema.documentos.id))
      .where(eq(schema.documentoChunks.id, id))
      .limit(1);

    return chunk ?? null;
  }

  async findById(id: number) {
    return this.findChunkById(id);
  }

  async findDocumentById(id: number) {
    const doc = await this.db.query.documentos.findFirst({
      where: eq(schema.documentos.id, id),
      with: {
        chunks: true
      }
    });
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
    const chunkUpdate: Partial<typeof schema.documentoChunks.$inferInsert> = {};
    if (data.tituloSeccion !== undefined) chunkUpdate.tituloSeccion = data.tituloSeccion;
    if (data.contenido !== undefined) chunkUpdate.contenido = data.contenido;

    if (Object.keys(chunkUpdate).length > 0) {
      await this.db
        .update(schema.documentoChunks)
        .set(chunkUpdate)
        .where(eq(schema.documentoChunks.id, id));
    }

    if (data.dominio !== undefined || data.habilidadId !== undefined) {
      const chunk = await this.findChunkById(id);
      if (chunk) {
        const docUpdate: Partial<typeof schema.documentos.$inferInsert> = {};
        if (data.dominio !== undefined) docUpdate.dominio = data.dominio;
        if (data.habilidadId !== undefined) docUpdate.habilidadId = data.habilidadId;
        await this.db
          .update(schema.documentos)
          .set(docUpdate)
          .where(eq(schema.documentos.id, chunk.documentoId));
      }
    }

    return this.findChunkById(id);
  }

  async deleteChunk(id: number) {
    const chunk = await this.findChunkById(id);
    if (!chunk) return null;

    const [deleted] = await this.db
      .delete(schema.documentoChunks)
      .where(eq(schema.documentoChunks.id, id))
      .returning();

    return deleted ?? null;
  }

  async deleteDocument(id: number) {
    const [deleted] = await this.db
      .delete(schema.documentos)
      .where(eq(schema.documentos.id, id))
      .returning();
    return deleted ?? null;
  }

  async findByAgentId(agenteId: number) {
    return this.db
      .select({
        id: schema.documentoChunks.id,
        documentoId: schema.documentos.id,
        agenteId: schema.documentos.agenteId,
        dominio: schema.documentos.dominio,
        habilidadId: schema.documentos.habilidadId,
        vectorId: schema.documentoChunks.vectorId,
        nombreArchivo: schema.documentos.nombreArchivo,
        tituloSeccion: schema.documentoChunks.tituloSeccion,
        contenido: schema.documentoChunks.contenido,
        createdAt: schema.documentoChunks.createdAt,
      })
      .from(schema.documentoChunks)
      .innerJoin(schema.documentos, eq(schema.documentoChunks.documentoId, schema.documentos.id))
      .where(eq(schema.documentos.agenteId, agenteId));
  }

  async findByDominios(dominios: string[], limit = 10) {
    const baseQuery = this.db
      .select({
        id: schema.documentoChunks.id,
        documentoId: schema.documentos.id,
        agenteId: schema.documentos.agenteId,
        dominio: schema.documentos.dominio,
        habilidadId: schema.documentos.habilidadId,
        vectorId: schema.documentoChunks.vectorId,
        nombreArchivo: schema.documentos.nombreArchivo,
        tituloSeccion: schema.documentoChunks.tituloSeccion,
        contenido: schema.documentoChunks.contenido,
        createdAt: schema.documentoChunks.createdAt,
      })
      .from(schema.documentoChunks)
      .innerJoin(schema.documentos, eq(schema.documentoChunks.documentoId, schema.documentos.id));

    if (dominios.includes('*')) {
      return baseQuery.limit(limit);
    }
    return baseQuery.where(inArray(schema.documentos.dominio, dominios)).limit(limit);
  }

  async findRelevantChunks(agenteId: number, dominios: string[] = ['transversal'], limit = 2) {
    const baseQuery = this.db
      .select({
        id: schema.documentoChunks.id,
        documentoId: schema.documentos.id,
        agenteId: schema.documentos.agenteId,
        dominio: schema.documentos.dominio,
        habilidadId: schema.documentos.habilidadId,
        vectorId: schema.documentoChunks.vectorId,
        nombreArchivo: schema.documentos.nombreArchivo,
        tituloSeccion: schema.documentoChunks.tituloSeccion,
        contenido: schema.documentoChunks.contenido,
        createdAt: schema.documentoChunks.createdAt,
      })
      .from(schema.documentoChunks)
      .innerJoin(schema.documentos, eq(schema.documentoChunks.documentoId, schema.documentos.id));

    if (dominios.includes('*')) {
      return baseQuery.limit(limit);
    }

    return baseQuery
      .where(
        or(
          eq(schema.documentos.agenteId, agenteId),
          inArray(schema.documentos.dominio, dominios)
        )
      )
      .limit(limit);
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
        querySql = sql`SELECT 
            c.id AS documento_id, 
            d.agente_id, 
            d.dominio, 
            c.titulo_seccion, 
            c.contenido 
          FROM fts_documento_chunks f
          JOIN documento_chunks c ON f.rowid = c.id
          JOIN documentos d ON c.documento_id = d.id
          WHERE fts_documento_chunks MATCH ${ftsQuery} 
          ORDER BY bm25(fts_documento_chunks) ASC
          LIMIT ${limit}`;
      } else {
        // Agente especialista: busca por su agenteId O por los dominios autorizados con ranking BM25
        const domainConditions = dominios.map((d) => sql`d.dominio = ${d}`);
        const domainClause = domainConditions.length > 0 
          ? sql.join(domainConditions, sql` OR `)
          : sql`1=0`;

        querySql = sql`SELECT 
            c.id AS documento_id, 
            d.agente_id, 
            d.dominio, 
            c.titulo_seccion, 
            c.contenido 
          FROM fts_documento_chunks f
          JOIN documento_chunks c ON f.rowid = c.id
          JOIN documentos d ON c.documento_id = d.id
          WHERE (d.agente_id = ${agenteId} OR ${domainClause}) 
            AND fts_documento_chunks MATCH ${ftsQuery} 
          ORDER BY bm25(fts_documento_chunks) ASC
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
      .from(schema.documentos)
      .where(eq(schema.documentos.agenteId, agenteId));
    return res[0]?.count ?? 0;
  }
}
