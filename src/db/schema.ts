import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const agentes = sqliteTable('agentes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug', { length: 60 }).notNull().unique(),
  nombre: text('nombre', { length: 100 }).notNull(),
  rol: text('rol', { length: 100 }).notNull(),
  modelo: text('modelo', { length: 80 }).notNull().default('@cf/meta/llama-4-scout-17b-16e-instruct'),
  temperatura: real('temperatura').notNull().default(0.2),
  systemPrompt: text('system_prompt').notNull(),
  activo: integer('activo').notNull().default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const habilidades = sqliteTable('habilidades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo', { length: 50 }).notNull().unique(),
  nombre: text('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
});

export const agenteHabilidades = sqliteTable('agente_habilidades', {
  agenteId: integer('agente_id')
    .notNull()
    .references(() => agentes.id, { onDelete: 'cascade' }),
  habilidadId: integer('habilidad_id')
    .notNull()
    .references(() => habilidades.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.agenteId, table.habilidadId] })
]);

export const agenteDocumentos = sqliteTable('agente_documentos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agenteId: integer('agente_id')
    .references(() => agentes.id, { onDelete: 'cascade' }),
  dominio: text('dominio', { length: 50 }).notNull().default('transversal'),
  habilidadId: integer('habilidad_id')
    .references(() => habilidades.id, { onDelete: 'cascade' }),
  vectorId: text('vector_id', { length: 64 }),
  nombreArchivo: text('nombre_archivo', { length: 150 }).notNull(),
  tituloSeccion: text('titulo_seccion', { length: 200 }).notNull(),
  contenido: text('contenido').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const agentesRelations = relations(agentes, ({ many }) => ({
  habilidades: many(agenteHabilidades),
  documentos: many(agenteDocumentos),
}));

export const habilidadesRelations = relations(habilidades, ({ many }) => ({
  agentes: many(agenteHabilidades),
  documentos: many(agenteDocumentos),
}));

export const agenteHabilidadesRelations = relations(agenteHabilidades, ({ one }) => ({
  agente: one(agentes, {
    fields: [agenteHabilidades.agenteId],
    references: [agentes.id],
  }),
  habilidad: one(habilidades, {
    fields: [agenteHabilidades.habilidadId],
    references: [habilidades.id],
  }),
}));

export const agenteDocumentosRelations = relations(agenteDocumentos, ({ one }) => ({
  agente: one(agentes, {
    fields: [agenteDocumentos.agenteId],
    references: [agentes.id],
  }),
  habilidad: one(habilidades, {
    fields: [agenteDocumentos.habilidadId],
    references: [habilidades.id],
  }),
}));
