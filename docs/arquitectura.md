# Arquitectura del Sistema: Orquestador Serverless Edge de Agentes Constitucionales

Documento de justificación y especificación arquitectónica del sistema de gestión y consulta de Agentes de IA en el borde (Edge Computing) con Astro y Cloudflare.

---

## 1. Diagrama de Arquitectura de 3 Capas

```mermaid
flowchart TD
    subgraph Capa1["CAPA 1: PRESENTACIÓN (Astro SSR & UI Islands)"]
        UI_Dash["Dashboard de Agentes (/)"]
        UI_Form["Formulario de Registro (/nuevo)"]
        UI_Chat["Consola RAG Constitucional (/chat/[id])"]
        Client_API["Cliente HTTP Tipado (apiClient.ts)"]
        UI_Dash --> Client_API
        UI_Form --> Client_API
        UI_Chat --> Client_API
    end

    subgraph Capa2["CAPA 2: LÓGICA Y CONTROLADORES REST (Cloudflare Functions)"]
        API_Agentes["/api/agentes (GET, POST)"]
        API_Detalle["/api/agentes/:id (GET, PUT, DELETE)"]
        API_Conocimiento["/api/agentes/:id/conocimiento (POST Ingesta)"]
        API_Consultar["/api/agentes/:id/consultar (POST RAG)"]
        
        Zod_Val["Validación y DTOs (Zod + Drizzle-Zod)"]
        Service_Agent["AgentService (Reglas de Negocio)"]
        Service_RAG["RagService (Pipeline RAG Híbrido)"]
        
        API_Agentes --> Zod_Val --> Service_Agent
        API_Detalle --> Zod_Val --> Service_Agent
        API_Conocimiento --> Zod_Val --> Service_RAG
        API_Consultar --> Zod_Val --> Service_RAG
    end

    subgraph Capa3A["CAPA 3A: PERSISTENCIA RELACIONAL (Cloudflare D1)"]
        Drizzle_ORM["Drizzle ORM (drizzle-orm/d1)"]
        Repo_Agent["AgentRepository"]
        Repo_Doc["DocumentRepository"]
        
        D1_Agentes["Tabla: agentes"]
        D1_Habs["Tabla: habilidades"]
        D1_Inter["Tabla: agente_habilidades"]
        D1_Docs["Tabla: agente_documentos"]
        D1_FTS["Virtual Table: fts_documentos (FTS5)"]
        D1_Triggers["Triggers Automáticos de Sincronización"]
        
        Service_Agent --> Repo_Agent --> Drizzle_ORM
        Service_RAG --> Repo_Doc --> Drizzle_ORM
        
        Drizzle_ORM --> D1_Agentes
        Drizzle_ORM --> D1_Habs
        Drizzle_ORM --> D1_Inter
        Drizzle_ORM --> D1_Docs
        D1_Docs -->|AFTER INSERT/UPDATE/DELETE| D1_Triggers --> D1_FTS
    end

    subgraph Capa3B["CAPA 3B: INTELIGENCIA ARTIFICIAL Y VECTORES"]
        Workers_AI["Cloudflare Workers AI"]
        Vectorize["Cloudflare Vectorize (1024-D Cosine)"]
        
        Model_LLM["@cf/meta/llama-3.1-8b-instruct"]
        Model_Embed["@cf/baai/bge-m3 (Embeddings Multilingües)"]
        
        Service_RAG -->|Generación de Vectores| Model_Embed
        Service_RAG -->|Indexación y Búsqueda Semántica| Vectorize
        Service_RAG -->|Inferencia Aumentada por Contexto| Model_LLM
    end

    Client_API -->|HTTP REST JSON / SSE| Capa2
```

---

## 2. Principios de Diseño de Software

### 2.1. Desacoplamiento Estricto
1. **Frontend Desacoplado:** Las vistas Astro y componentes interactivos nunca acceden directamente a sentencias SQL ni bindings de Cloudflare. Toda interacción se realiza a través de `apiClient.ts` consumiendo la API REST mediante `fetch()`.
2. **Repository Pattern:** Las consultas D1 y sentencias Drizzle quedan confinadas en `src/repositories/`. Los controladores HTTP ignoran la estructura de base de datos subyacente.
3. **Service Layer Pattern:** La validación de negocio (unicidad de slugs, restricciones de integridad referencial, sanitización) y la orquestación del RAG se encapsulan en `src/services/`.
4. **Thin Controllers:** Los endpoints en `src/pages/api/` se limitan a recibir el request, validar el payload con Zod, delegar al servicio y emitir el código de respuesta HTTP correspondiente.

### 2.2. Flujo RAG Híbrido en el Borde
- **Búsqueda Semántica (Vectorize):** Genera embeddings con `@cf/baai/bge-m3` y busca vectores afines por similitud coseno.
- **Búsqueda Léxica (D1 FTS5):** Cuando el usuario menciona términos o números de artículo exactos (ej. "Artículo 86", "Tutela"), el motor ejecuta consultas de texto completo optimizadas sobre `fts_documentos`.
- **Inferencia Grounded (Workers AI):** El contexto recuperado de ambas fuentes se inyecta en el prompt del sistema de `@cf/meta/llama-3.1-8b-instruct`, garantizando que el agente justifique su respuesta con la base normativa constitucional sin alucinaciones.
