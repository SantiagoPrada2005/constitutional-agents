import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createDb } from '../../../../db';
import { AgentRepository } from '../../../../repositories/agent.repository';
import { DocumentRepository } from '../../../../repositories/document.repository';
import { RagService } from '../../../../services/rag.service';
import { IngestDocumentSchema, UpdateDocumentChunkSchema } from '../../../../schemas/chat.schema';
import { getBindings } from '../../../../lib/env';

export const prerender = false;

// GET: Consultar fragmentos de conocimiento del agente o dominio
export const GET: APIRoute = async ({ params, request, locals }) => {
  const agentId = Number(params.id);
  if (isNaN(agentId)) {
    return new Response(JSON.stringify({ success: false, message: 'ID de agente inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, message: `Agente con ID ${agentId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const docRepo = new DocumentRepository(db);
    const url = new URL(request.url);
    const dominio = url.searchParams.get('dominio');
    const all = url.searchParams.get('all') === 'true';

    let docs;
    if (all) {
      docs = await docRepo.findByDominios(['*'], 100);
    } else if (dominio) {
      docs = await docRepo.findByDominios([dominio], 100);
    } else {
      docs = await docRepo.findByAgentId(agentId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: docs.length,
        data: docs
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al consultar conocimiento';
    return new Response(
      JSON.stringify({ success: false, message: 'Error al consultar conocimiento', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST: Ingestar archivo .md a la base de conocimiento del agente
export const POST: APIRoute = async ({ params, request, locals }) => {
  const agentId = Number(params.id);
  if (isNaN(agentId)) {
    return new Response(JSON.stringify({ success: false, message: 'ID de agente inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'JSON de solicitud inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validation = IngestDocumentSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Datos de documento inválidos',
        errors: z.flattenError(validation.error).fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, message: `Agente con ID ${agentId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const docRepo = new DocumentRepository(db);
    const ragService = new RagService(docRepo, agentRepo, env.AI, env.VECTOR_INDEX);

    const result = await ragService.ingestDocument(
      agentId,
      validation.data.nombreArchivo,
      validation.data.contenido,
      validation.data.dominio,
      validation.data.habilidadId
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Documento ingestado e indexado exitosamente en D1 y Vectorize',
        chunksIngested: result.chunksIngested,
        sections: result.sections
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error durante la ingesta documental';
    return new Response(
      JSON.stringify({ success: false, message: 'Error durante la ingesta documental', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Modificar una sección/fragmento de conocimiento existente
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const agentId = Number(params.id);
  if (isNaN(agentId)) {
    return new Response(JSON.stringify({ success: false, message: 'ID de agente inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'JSON de solicitud inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validation = UpdateDocumentChunkSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Datos de actualización inválidos',
        errors: z.flattenError(validation.error).fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const docId = validation.data.documentoId ?? validation.data.id!;

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agent = await agentRepo.findById(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, message: `Agente con ID ${agentId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const docRepo = new DocumentRepository(db);
    const existingDoc = await docRepo.findById(docId);
    if (!existingDoc) {
      return new Response(
        JSON.stringify({ success: false, message: `Documento con ID ${docId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updated = await docRepo.updateChunk(docId, {
      tituloSeccion: validation.data.tituloSeccion,
      contenido: validation.data.contenido,
      dominio: validation.data.dominio
    });

    // Actualizar embedding en Vectorize si está disponible
    if (env.AI && env.VECTOR_INDEX && validation.data.contenido && existingDoc.vectorId) {
      try {
        const aiResponse = await env.AI.run('@cf/baai/bge-m3', {
          text: [validation.data.contenido]
        });
        const vector = (aiResponse && 'data' in aiResponse && Array.isArray(aiResponse.data))
          ? aiResponse.data[0]
          : (aiResponse && 'response' in aiResponse && Array.isArray(aiResponse.response) && Array.isArray(aiResponse.response[0]))
            ? aiResponse.response[0]
            : undefined;
        if (vector && Array.isArray(vector)) {
          await env.VECTOR_INDEX.upsert([
            {
              id: existingDoc.vectorId,
              values: vector,
              metadata: {
                agente_id: existingDoc.agenteId ? String(existingDoc.agenteId) : '',
                dominio: validation.data.dominio ?? existingDoc.dominio ?? '',
                titulo: validation.data.tituloSeccion ?? existingDoc.tituloSeccion,
                archivo: existingDoc.nombreArchivo
              }
            }
          ]);
        }
      } catch (vErr) {
        console.warn('[RAG] Fallback: Vectorize upsert skipped', vErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sección de conocimiento actualizada exitosamente',
        data: updated
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar sección';
    return new Response(
      JSON.stringify({ success: false, message: 'Error al actualizar sección', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Eliminar una sección de conocimiento
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const agentId = Number(params.id);
  if (isNaN(agentId)) {
    return new Response(JSON.stringify({ success: false, message: 'ID de agente inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  let docId = Number(url.searchParams.get('documentoId') || url.searchParams.get('id'));

  if (isNaN(docId) || docId <= 0) {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      docId = Number(body?.['documentoId'] || body?.['id']);
    } catch {
      // Body vacío o no parseable
    }
  }

  if (isNaN(docId) || docId <= 0) {
    return new Response(
      JSON.stringify({ success: false, message: 'documentoId válido es obligatorio en query params o body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agent = await agentRepo.findById(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, message: `Agente con ID ${agentId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const docRepo = new DocumentRepository(db);
    const existingDoc = await docRepo.findById(docId);
    if (!existingDoc) {
      return new Response(
        JSON.stringify({ success: false, message: `Documento con ID ${docId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await docRepo.deleteChunk(docId);

    // Limpieza en Vectorize si está disponible
    if (env.VECTOR_INDEX && existingDoc.vectorId) {
      try {
        await env.VECTOR_INDEX.deleteByIds([existingDoc.vectorId]);
      } catch (vErr) {
        console.warn('[RAG] Fallback: Vectorize delete skipped', vErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sección de conocimiento eliminada exitosamente',
        documentoId: docId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar sección';
    return new Response(
      JSON.stringify({ success: false, message: 'Error al eliminar sección', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
