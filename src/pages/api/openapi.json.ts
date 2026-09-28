import type { APIRoute } from 'astro';
import { openApiSpec } from '../../lib/openapi';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(openApiSpec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
  });
};
