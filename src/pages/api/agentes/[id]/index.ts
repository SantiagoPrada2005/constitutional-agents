import type { APIRoute } from 'astro';
import { createDb } from '../../../../db';
import { AgentRepository } from '../../../../repositories/agent.repository';
import { AgentService, ConflictError, NotFoundError } from '../../../../services/agent.service';
import { UpdateAgentSchema } from '../../../../schemas/agent.schema';

import { getBindings } from '../../../../lib/env';

export const prerender = false;

// GET: Obtener detalle del agente
export const GET: APIRoute = async ({ params, locals }) => {
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
    const agentService = new AgentService(agentRepo);

    const agent = await agentService.getAgentById(agentId);
    return new Response(JSON.stringify(agent), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Actualizar parámetros del agente
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validation = UpdateAgentSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Validación de actualización fallida',
        errors: validation.error.flatten().fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agentService = new AgentService(agentRepo);

    const updated = await agentService.updateAgent(agentId, validation.data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Agente actualizado exitosamente',
        data: updated
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (error instanceof ConflictError || error.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Eliminar agente y dependencias
export const DELETE: APIRoute = async ({ params, locals }) => {
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
    const agentService = new AgentService(agentRepo);

    await agentService.deleteAgent(agentId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Agente eliminado exitosamente'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
