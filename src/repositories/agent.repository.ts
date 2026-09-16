import { eq, inArray, desc } from 'drizzle-orm';
import type { AppDatabase } from '../db';
import * as schema from '../db/schema';

export interface CreateAgentInput {
  slug: string;
  nombre: string;
  rol: string;
  modelo?: string | undefined;
  temperatura?: number | undefined;
  systemPrompt: string;
  activo?: number | undefined;
}

export interface UpdateAgentInput {
  slug?: string | undefined;
  nombre?: string | undefined;
  rol?: string | undefined;
  modelo?: string | undefined;
  temperatura?: number | undefined;
  systemPrompt?: string | undefined;
  activo?: number | undefined;
}

export class AgentRepository {
  constructor(private readonly db: AppDatabase) {}

  async findAll() {
    const records = await this.db.query.agentes.findMany({
      orderBy: [desc(schema.agentes.createdAt)],
      with: {
        habilidades: {
          with: {
            habilidad: true
          }
        },
        documentos: true
      }
    });

    return records.map((agent) => ({
      ...agent,
      habilidadesList: agent.habilidades.map((h) => h.habilidad),
      habilidadesCodigos: agent.habilidades.map((h) => h.habilidad.codigo),
      habilidades: agent.habilidades.map((h) => h.habilidad.codigo).join(','),
      documentosCount: agent.documentos.length
    }));
  }

  async findById(id: number) {
    const agent = await this.db.query.agentes.findFirst({
      where: eq(schema.agentes.id, id),
      with: {
        habilidades: {
          with: {
            habilidad: true
          }
        },
        documentos: {
          orderBy: [desc(schema.agenteDocumentos.createdAt)]
        }
      }
    });

    if (!agent) return null;

    return {
      ...agent,
      habilidadesList: agent.habilidades.map((h) => h.habilidad),
      habilidadesCodigos: agent.habilidades.map((h) => h.habilidad.codigo),
      habilidades: agent.habilidades.map((h) => h.habilidad.codigo).join(','),
      documentosCount: agent.documentos.length
    };
  }

  async findBySlug(slug: string) {
    const agent = await this.db.query.agentes.findFirst({
      where: eq(schema.agentes.slug, slug)
    });
    return agent || null;
  }

  async create(data: CreateAgentInput, skillCodes: string[] = []) {
    const [newAgent] = await this.db
      .insert(schema.agentes)
      .values({
        slug: data.slug,
        nombre: data.nombre,
        rol: data.rol,
        modelo: data.modelo || '@cf/meta/llama-4-scout-17b-16e-instruct',
        temperatura: data.temperatura ?? 0.2,
        systemPrompt: data.systemPrompt,
        activo: data.activo ?? 1
      })
      .returning();

    if (!newAgent) {
      throw new Error('No fue posible crear el registro del agente');
    }

    if (skillCodes.length > 0) {
      const skills = await this.db
        .select({ id: schema.habilidades.id })
        .from(schema.habilidades)
        .where(inArray(schema.habilidades.codigo, skillCodes));

      if (skills.length > 0) {
        const batchInserts = skills.map((s) =>
          this.db.insert(schema.agenteHabilidades).values({
            agenteId: newAgent.id,
            habilidadId: s.id
          }).onConflictDoNothing()
        );
        await this.db.batch(batchInserts as [any, ...any[]]);
      }
    }

    return this.findById(newAgent.id);
  }

  async update(id: number, data: UpdateAgentInput, skillCodes?: string[]) {
    const updatePayload: Record<string, any> = {};
    if (data.slug !== undefined) updatePayload['slug'] = data.slug;
    if (data.nombre !== undefined) updatePayload['nombre'] = data.nombre;
    if (data.rol !== undefined) updatePayload['rol'] = data.rol;
    if (data.modelo !== undefined) updatePayload['modelo'] = data.modelo;
    if (data.temperatura !== undefined) updatePayload['temperatura'] = data.temperatura;
    if (data.systemPrompt !== undefined) updatePayload['systemPrompt'] = data.systemPrompt;
    if (data.activo !== undefined) updatePayload['activo'] = data.activo;

    if (Object.keys(updatePayload).length > 0) {
      await this.db
        .update(schema.agentes)
        .set(updatePayload)
        .where(eq(schema.agentes.id, id));
    }

    if (skillCodes !== undefined) {
      // Remove current skill links
      await this.db
        .delete(schema.agenteHabilidades)
        .where(eq(schema.agenteHabilidades.agenteId, id));

      if (skillCodes.length > 0) {
        const skills = await this.db
          .select({ id: schema.habilidades.id })
          .from(schema.habilidades)
          .where(inArray(schema.habilidades.codigo, skillCodes));

        if (skills.length > 0) {
          const batchInserts = skills.map((s) =>
            this.db.insert(schema.agenteHabilidades).values({
              agenteId: id,
              habilidadId: s.id
            }).onConflictDoNothing()
          );
          await this.db.batch(batchInserts as [any, ...any[]]);
        }
      }
    }

    return this.findById(id);
  }

  async delete(id: number) {
    const [deleted] = await this.db
      .delete(schema.agentes)
      .where(eq(schema.agentes.id, id))
      .returning({ id: schema.agentes.id });
    return !!deleted;
  }

  async findAllSkills() {
    return this.db.select().from(schema.habilidades);
  }
}
