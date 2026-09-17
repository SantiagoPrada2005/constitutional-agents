import { env as cfEnv } from 'cloudflare:workers';

export type CloudflareBindings = {
  DB: D1Database;
  AI?: Ai;
  VECTOR_INDEX?: VectorizeIndex;
};

export function getBindings(locals?: App.Locals): CloudflareBindings | undefined {
  return cfEnv || locals?.runtime?.env;
}
