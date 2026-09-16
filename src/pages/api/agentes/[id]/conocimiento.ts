import type { APIRoute } from 'astro';
import { createDb } from '../../../../db';
import { AgentRepository } from '../../../../repositories/agent.repository';
import { DocumentRepository } from '../../../../repositories/document.repository';
import { RagService } from '../../../../services/rag.service';
import { IngestDocumentSchema } from '../../../../schemas/chat.schema';
import { getBindings } from '../../../../lib/env';

export const prerender = false;

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

  let body: any;
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
        errors: validation.error.flatten().fieldErrors
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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Error durante la ingesta documental', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
