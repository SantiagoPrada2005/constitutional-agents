import { env as cfEnv } from 'cloudflare:workers';

export function getBindings(locals?: any) {
  return cfEnv || (locals as any)?.runtime?.env;
}
