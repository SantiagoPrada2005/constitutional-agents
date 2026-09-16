import type { APIRoute } from 'astro';
import { createDb } from '../../db';
import { AgentRepository } from '../../repositories/agent.repository';
import { getBindings } from '../../lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = getBindings(locals);
  if (!env?.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Base de datos D1 no disponible' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = createDb(env.DB);
    const repo = new AgentRepository(db);
    const skills = await repo.findAllSkills();

    return new Response(JSON.stringify(skills), {
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
