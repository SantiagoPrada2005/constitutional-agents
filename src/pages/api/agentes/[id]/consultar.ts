import type { APIRoute } from 'astro';
import { z } from 'zod';
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

  let body: unknown;
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
        errors: z.flattenError(validation.error).fieldErrors
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
    const { response, contextChunks, isLiveAI, modelUsed } = await ragService.generateAnswer(
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
          'x-rag-chunks-count': String(contextChunks.length),
          'x-model-used': modelUsed || agent.modelo
        }
      });
    }

    // JSON response
    let respuestaFinal: string;
    if (typeof response === 'string') {
      respuestaFinal = response;
    } else if (
      typeof response === 'object' &&
      response !== null &&
      'response' in response &&
      typeof (response as Record<string, unknown>)['response'] === 'string'
    ) {
      respuestaFinal = (response as Record<string, unknown>)['response'] as string;
    } else {
      respuestaFinal = JSON.stringify(response);
    }

    return new Response(
      JSON.stringify({
        success: true,
        agente: {
          id: agent.id,
          nombre: agent.nombre,
          rol: agent.rol,
          modelo: agent.modelo
        },
        modeloUsado: modelUsed || agent.modelo,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error en la inferencia RAG';
    return new Response(
      JSON.stringify({ success: false, message: 'Error en la inferencia RAG', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
