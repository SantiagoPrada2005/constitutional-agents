/// <reference path="../.astro/types.d.ts" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type Ai = import('@cloudflare/workers-types').Ai;
type VectorizeIndex = import('@cloudflare/workers-types').VectorizeIndex;

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: D1Database;
        AI: Ai;
        VECTOR_INDEX: VectorizeIndex;
      };
    };
  }
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    AI?: Ai;
    VECTOR_INDEX?: VectorizeIndex;
  };
}
