import type { APIRoute } from 'astro';
import { createDb } from '../../../db';
import { AgentRepository } from '../../../repositories/agent.repository';
import { AgentService, ConflictError } from '../../../services/agent.service';
import { InsertAgentSchema } from '../../../schemas/agent.schema';

import { getBindings } from '../../../lib/env';

export const prerender = false;

// GET: Consultar agentes con sus habilidades vinculadas
export const GET: APIRoute = async ({ locals }) => {
  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible en el entorno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agentService = new AgentService(agentRepo);

    const results = await agentService.getAllAgents();

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Registrar un nuevo agente
export const POST: APIRoute = async ({ request, locals }) => {
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
    return new Response(JSON.stringify({ success: false, message: 'Cuerpo de petición JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validación estricta con Zod
  const validation = InsertAgentSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Validación fallida: campos requeridos faltantes o inválidos',
        errors: validation.error.flatten().fieldErrors
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDb(env.DB);
    const agentRepo = new AgentRepository(db);
    const agentService = new AgentService(agentRepo);

    const nuevoAgente = await agentService.createAgent(validation.data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Agente registrado exitosamente',
        data: nuevoAgente,
        id: nuevoAgente?.id
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error instanceof ConflictError || error.message?.includes('UNIQUE')) {
      return new Response(
        JSON.stringify({ success: false, message: error.message || 'El identificador (slug) ya existe' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Error interno en el servidor', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
