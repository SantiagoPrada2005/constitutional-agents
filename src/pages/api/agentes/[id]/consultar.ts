import type { APIRoute } from 'astro';
import { createDb } from '../../../../db';
import { AgentRepository } from '../../../../repositories/agent.repository';
import { DocumentRepository } from '../../../../repositories/document.repository';
import { RagService } from '../../../../services/rag.service';
import { ChatQuerySchema } from '../../../../schemas/chat.schema';
import { getBindings } from '../../../../lib/env';

export const prerender = false;

// POST: Consulta con RAG y respuesta de IA
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
    return new Response(JSON.stringify({ success: false, message: 'JSON de consulta inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validation = ChatQuerySchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Validación de consulta fallida',
        errors: validation.error.flatten().fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const docRepo = new DocumentRepository(db);
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      return new Response(
        JSON.stringify({ success: false, message: `Agente con ID ${agentId} no encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ragService = new RagService(docRepo, agentRepo, env.AI, env.VECTOR_INDEX);
    const { response, contextChunks, isLiveAI } = await ragService.generateAnswer(
      agentId,
      validation.data.pregunta,
      validation.data.stream
    );

    // If streaming SSE requested and response is a stream
    if (validation.data.stream && isLiveAI && response instanceof ReadableStream) {
      return new Response(response, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'x-rag-chunks-count': String(contextChunks.length)
        }
      });
    }

    // JSON response
    const respuestaFinal = typeof response === 'string'
      ? response
      : (response as any)?.response || JSON.stringify(response);

    return new Response(
      JSON.stringify({
        success: true,
        agente: {
          id: agent.id,
          nombre: agent.nombre,
          rol: agent.rol,
          modelo: agent.modelo
        },
        pregunta: validation.data.pregunta,
        respuesta: respuestaFinal,
        citas: contextChunks,
        isLiveAI
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Error en la inferencia RAG', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
