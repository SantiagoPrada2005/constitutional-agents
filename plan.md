# Implementation Plan: Constitutional AI Agent Orchestrator

Develop an Edge-native Constitutional AI Agent Management and RAG Orchestration system on Cloudflare using Astro (SSR), Cloudflare Functions, Drizzle ORM, D1 (SQLite + FTS5), Vectorize, and Workers AI (Llama 3.1 8B + BGE-M3), matching the cyber-infrastructure terminal design from Stitch.

## User Review Required

> [!IMPORTANT]
> **Cloudflare Runtime Environment & Local Emulation**:
> In local development, Cloudflare D1, Vectorize, and Workers AI will be emulated using Wrangler and Miniflare (`platformProxy.enabled: true` in Astro's Cloudflare adapter). To execute real Workers AI and Vectorize calls locally, Wrangler can bind to remote resources or run via `wrangler pages dev` / `astro dev --remote`.
> 
> **Prueba 6 Implementation**:
> Per architecture spec (Section 4.2), serverless edge functions cannot be traditionally "shut down" as a separate server process. We will implement the required diagnostic mode via middleware/header (`x-mock-service-status: offline` or `SIMULATE_BACKEND_DOWN`) so the frontend gracefully catches 503 and triggers the resilience contingency component.

## Architecture & Project Structure

The project follows clean architecture principles with strict layer decoupling:

```
[ Frontend: Astro SSR + Reactive Islands (AgentTable, AgentForm, ChatInterface) ]
                               │
                      HTTP / JSON (REST API)
                               ▼
[ API Controllers: src/pages/api/agentes/* (Thin HTTP Controllers + Zod DTOs) ]
                               │
[ Service Layer: src/services/* (AgentService, RagService, ApiClient) ]
                               │
[ Data Access Layer: src/repositories/* (AgentRepository, DocumentRepository) ]
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
[ D1 Database (SQLite + FTS5) ]        [ Cloudflare Workers AI & Vectorize ]
  - Drizzle ORM                          - BGE-M3 (Embeddings 1024-d)
  - Synced FTS5 Triggers                 - Vectorize (Semantic retrieval)
                                         - Llama 3.1 8B (Streaming SSE)
```

---

## Proposed Changes

### 1. Project Initialization & Tooling Setup

Initialize the repository with Astro, Tailwind CSS, TypeScript, and Cloudflare bindings.

#### [NEW] [package.json](file:///Users/santiago/proyectos/agents-crud/package.json)
- Setup dependencies: `astro`, `@astrojs/cloudflare`, `@astrojs/tailwind`, `tailwindcss`, `drizzle-orm`, `drizzle-kit`, `zod`, `drizzle-zod`, `@cloudflare/workers-types`.

#### [NEW] [astro.config.mjs](file:///Users/santiago/proyectos/agents-crud/astro.config.mjs)
- Configure `output: 'server'` and `@astrojs/cloudflare` adapter with `platformProxy: { enabled: true }`.

#### [NEW] [wrangler.jsonc](file:///Users/santiago/proyectos/agents-crud/wrangler.jsonc)
- Configure bindings: `DB` (D1 database `bd_agentes`), `AI` (Workers AI), `VECTOR_INDEX` (`constitucion-colombia`).

#### [NEW] [tsconfig.json](file:///Users/santiago/proyectos/agents-crud/tsconfig.json)
- Strict TypeScript configuration extending `astro/tsconfigs/strict` with `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`.

#### [NEW] [src/env.d.ts](file:///Users/santiago/proyectos/agents-crud/src/env.d.ts)
- Type definitions for `App.Locals.runtime.env` (`DB: D1Database`, `AI: Ai`, `VECTOR_INDEX: VectorizeIndex`).

#### [NEW] [tailwind.config.mjs](file:///Users/santiago/proyectos/agents-crud/tailwind.config.mjs)
- Tokens from Stitch design system:
  - Surfaces: `#0b0f17`, `#111827`, `#1e293b`, `#334155`
  - Accents: Amber `#f38020`, Cyan `#06b6d4`, Emerald `#10b981`, Crimson `#ef4444`, Purple `#a855f7`
  - Fonts: Geist, JetBrains Mono

---

### 2. Database Layer & Constitutional Knowledge Base

Establish database schemas, migrations, FTS5 sync triggers, and knowledge documents.

#### [NEW] [database/schema.sql](file:///Users/santiago/proyectos/agents-crud/database/schema.sql)
- D1 SQL schema with PRAGMA foreign_keys, tables: `agentes`, `habilidades`, `agente_habilidades`, `agente_documentos`, `fts_documentos` (virtual table FTS5), and sync triggers (`trg_documentos_insert`, `trg_documentos_delete`, `trg_documentos_update`).

#### [NEW] [database/seed.sql](file:///Users/santiago/proyectos/agents-crud/database/seed.sql)
- Seed data for default skills (`CONSTITUCIONAL`, `DERECHOS_FUNDAMENTALES`, `TUTELA`, `MECANISMOS_PARTICIPACION`) and initial constitutional agent.

#### [NEW] [src/db/schema.ts](file:///Users/santiago/proyectos/agents-crud/src/db/schema.ts)
- Drizzle ORM schema mapping SQLite tables and typed relations.

#### [NEW] [src/db/index.ts](file:///Users/santiago/proyectos/agents-crud/src/db/index.ts)
- Database factory `createDb(d1: D1Database)`.

#### [NEW] [drizzle.config.ts](file:///Users/santiago/proyectos/agents-crud/drizzle.config.ts)
- Drizzle Kit configuration targeting Cloudflare D1.

#### [NEW] [conocimiento/titulo_1_principios.md](file:///Users/santiago/proyectos/agents-crud/conocimiento/titulo_1_principios.md)
#### [NEW] [conocimiento/titulo_2_derechos.md](file:///Users/santiago/proyectos/agents-crud/conocimiento/titulo_2_derechos.md)
#### [NEW] [conocimiento/titulo_4_participacion.md](file:///Users/santiago/proyectos/agents-crud/conocimiento/titulo_4_participacion.md)
- Markdown articles from the Colombian Political Constitution (Articles 1-10, 11-41, 103-106).

---

### 3. Domain Schemas & DTOs (Validation)

#### [NEW] [src/schemas/agent.schema.ts](file:///Users/santiago/proyectos/agents-crud/src/schemas/agent.schema.ts)
- Zod schemas inferred via `drizzle-zod` for `InsertAgentSchema`, `UpdateAgentSchema`, `SelectAgentSchema`, and skill arrays.

#### [NEW] [src/schemas/chat.schema.ts](file:///Users/santiago/proyectos/agents-crud/src/schemas/chat.schema.ts)
- Zod schemas for RAG query requests (`ChatQuerySchema`) and document ingestion (`IngestDocumentSchema`).

---

### 4. Data Repositories & Services

#### [NEW] [src/repositories/agent.repository.ts](file:///Users/santiago/proyectos/agents-crud/src/repositories/agent.repository.ts)
- Encapsulates queries for agents, skills, and relational joins with Drizzle.

#### [NEW] [src/repositories/document.repository.ts](file:///Users/santiago/proyectos/agents-crud/src/repositories/document.repository.ts)
- Encapsulates inserts of document chunks into `agente_documentos` and FTS5 search queries.

#### [NEW] [src/services/agent.service.ts](file:///Users/santiago/proyectos/agents-crud/src/services/agent.service.ts)
- Business logic: slug uniqueness, skill associations, agent lifecycle validations.

#### [NEW] [src/services/rag.service.ts](file:///Users/santiago/proyectos/agents-crud/src/services/rag.service.ts)
- Markdown chunking, BGE-M3 embedding generation (`@cf/baai/bge-m3`), Vectorize indexing & query, D1 FTS5 lexical fallback, prompt augmentation, and Llama 3.1 8B streaming inference.

#### [NEW] [src/services/client/apiClient.ts](file:///Users/santiago/proyectos/agents-crud/src/services/client/apiClient.ts)
- Unified frontend HTTP client handling timeouts, standard errors, and simulation headers for offline diagnostic checks.

---

### 5. Backend REST API Controllers (Cloudflare Functions)

Thin HTTP routes under `src/pages/api/`:

#### [NEW] [src/pages/api/agentes/index.ts](file:///Users/santiago/proyectos/agents-crud/src/pages/api/agentes/index.ts)
- `GET`: List all agents with skills (200).
- `POST`: Create new agent with input validation (201, 400, 409).

#### [NEW] [src/pages/api/agentes/[id]/index.ts](file:///Users/santiago/proyectos/agents-crud/src/pages/api/agentes/[id]/index.ts)
- `GET`: Retrieve agent by ID (200, 404).
- `PUT`: Update agent parameters (200, 400, 404).
- `DELETE`: Remove agent and cascade relations (200, 404).

#### [NEW] [src/pages/api/agentes/[id]/conocimiento.ts](file:///Users/santiago/proyectos/agents-crud/src/pages/api/agentes/[id]/conocimiento.ts)
- `POST`: Ingest markdown document into agent knowledge base (201, 400).

#### [NEW] [src/pages/api/agentes/[id]/consultar.ts](file:///Users/santiago/proyectos/agents-crud/src/pages/api/agentes/[id]/consultar.ts)
- `POST`: RAG retrieval + Workers AI streaming inference via Server-Sent Events (`text/event-stream`).

#### [NEW] [src/pages/api/health.ts](file:///Users/santiago/proyectos/agents-crud/src/pages/api/health.ts)
- Health check and diagnostic simulation endpoint for Prueba 6.

---

### 6. Frontend Presentation Layer (Astro Islands + Stitch Design)

Faithful translation of the Stitch screens (Screens 4, 5, 6, 7, 8) into clean, modular Astro components with high-density cyber-infrastructure aesthetics.

#### [NEW] [src/layouts/Layout.astro](file:///Users/santiago/proyectos/agents-crud/src/layouts/Layout.astro)
- Global workbench shell: top telemetry bar (48px), collapsible navigation dock (56px), status pill indicators, and font styling (`Geist` + `JetBrains Mono`).

#### [NEW] [src/components/AlertBanner.astro](file:///Users/santiago/proyectos/agents-crud/src/components/AlertBanner.astro)
- Resilient contingency banner for backend communication failures (Prueba 6).

#### [NEW] [src/components/AgentTable.astro](file:///Users/santiago/proyectos/agents-crud/src/components/AgentTable.astro)
- High-density agent grid/table with active badges, model chip, latency stats, and action buttons (Consultar, Editar, Eliminar).

#### [NEW] [src/components/AgentForm.astro](file:///Users/santiago/proyectos/agents-crud/src/components/AgentForm.astro)
- Interactive client island for agent creation/editing with reactive validation, temperature slider, skill toggles, and live slug generator.

#### [NEW] [src/components/ChatInterface.astro](file:///Users/santiago/proyectos/agents-crud/src/components/ChatInterface.astro)
- Constitutional RAG terminal with live token streaming (SSE), citation source cards (similarity score, chunk ID, article excerpt), and query latency counter.

#### [NEW] [src/pages/index.astro](file:///Users/santiago/proyectos/agents-crud/src/pages/index.astro)
- Agent Management Dashboard (Screens 4 & 5) matching desktop 3-pane layout and responsive mobile view.

#### [NEW] [src/pages/nuevo.astro](file:///Users/santiago/proyectos/agents-crud/src/pages/nuevo.astro)
- New Agent Registration view (Screen 7).

#### [NEW] [src/pages/chat/[id].astro](file:///Users/santiago/proyectos/agents-crud/src/pages/chat/[id].astro)
- Agent Chat & Constitutional RAG Console (Screens 6 & 8).

---

### 7. Documentation & Deliverables

#### [NEW] [docs/documentacion_api.md](file:///Users/santiago/proyectos/agents-crud/docs/documentacion_api.md)
- Complete technical API specification detailing all endpoints, request/response headers, JSON DTOs, HTTP status codes, and curl examples.

#### [NEW] [docs/arquitectura.md](file:///Users/santiago/proyectos/agents-crud/docs/arquitectura.md)
- 3-tier architecture documentation and Mermaid diagram explaining edge flow from Astro UI Islands to Cloudflare Functions, D1, and Workers AI.

---

## Verification Plan

### Automated Tests & Quality Checks
- `npm run check` (Astro typecheck & diagnostics)
- `npx tsc --noEmit` (Strict TypeScript verification)
- Integration test suite for REST API endpoints using local Miniflare/D1 emulation

### Manual Verification Matrix (Pruebas 1 to 6)
1. **Prueba 1 (Consultar Agentes)**: Load `/` and verify agents list is fetched via `GET /api/agentes`.
2. **Prueba 2 (Registro Correcto)**: Submit form at `/nuevo` with valid data, verify 201 Created and redirection/update in D1.
3. **Prueba 3 (Validación de Campos)**: Submit empty form, verify 400 Bad Request and validation error messages without DB writing.
4. **Prueba 4 (Restricción de Duplicados)**: Attempt registering an existing slug, verify 409 Conflict.
5. **Prueba 5 (Consulta RAG con .md)**: Ask Constitutional questions (e.g. "derecho a la vida") and verify grounding citations from ingested `.md`.
6. **Prueba 6 (Desconexión del Servicio)**: Simulate backend outage via diagnostic switch, verify frontend triggers AlertBanner: *"Error de comunicación: No fue posible conectarse con el servicio de API REST..."*.
