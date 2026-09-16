Especificación de Proyecto: Sistema de Gestión y Orquestación de Agentes de IA

Arquitectura Serverless Edge con Astro y Cloudflare (Functions + D1 + Workers AI)

1. Ficha Técnica

⚬ Nombre del Proyecto: Sistema de Gestión y Consulta de Agentes de IA Especializados en Normativa Constitucional.
⚬ Materia / Curso: Servicios Web y Arquitectura de Software.
⚬ Paradigma: Arquitectura orientada a servicios REST desacoplada, ejecutada sobre computación en el borde (Edge Computing / Serverless Functions).
⚬ Stack Tecnológico:
  ⚬ Framework Principal: Astro (última versión, modo output: 'server' con @astrojs/cloudflare).
  ⚬ Capa Backend / API: Cloudflare Functions nativas (Endpoints REST compilados para el runtime de Cloudflare Workers bajo src/pages/api/).
  ⚬ ORM y Capa de Datos: Drizzle ORM (`drizzle-orm/d1` con `drizzle-kit` para migraciones y tipado estricto end-to-end).
  ⚬ Persistencia (Base de Datos): Cloudflare D1 (motor relacional SQL/SQLite con soporte para FTS5 y triggers de sincronización).
  ⚬ Base de Datos Vectorial: Cloudflare Vectorize (índice vectorial para recuperación semántica densa de alta fidelidad).
  ⚬ Motor de Inferencia y Embeddings de IA: Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct para generación y @cf/baai/bge-m3 para embeddings multilingües de 1024 dimensiones).
  ⚬ Base de Conocimiento: Archivos Markdown (.md) con artículos de la Constitución Política de Colombia indexados vectorial y relacionalmente (RAG Híbrido).

2. Descripción General y Justificación

El proyecto implementa un sistema completo para el registro, configuración, personalización e interacción con Agentes de Inteligencia Artificial especializados.

A diferencia de una arquitectura tradicional con servidores dedicados o contenedores:

1. El sistema se ejecuta íntegramente sobre la infraestructura global de Cloudflare.
2. Los servicios web de backend se implementan como Cloudflare Functions nativas dentro del flujo de Astro, accediendo directamente a los bindings de Cloudflare D1 (env.DB) y Workers AI (env.AI) a través de Astro.locals.runtime.env.
3. Se mantiene el principio fundamental de separación de responsabilidades:
  ⚬ Las vistas de usuario (Frontend) no ejecutan sentencias SQL ni acceden a variables privilegiadas.
  ⚬ La interfaz interactúa con la lógica de negocio y los datos exclusivamente consumiendo la API REST mediante peticiones asíncronas HTTP (fetch) que intercambian cargas útiles en formato JSON.
4. Cada agente cuenta con una base de conocimiento documental propia que permite realizar preguntas sobre la Constitución Política de Colombia, ejecutando un flujo RAG (Retrieval-Augmented Generation) en el borde.

3. Objetivos

Objetivo General

Desarrollar una aplicación web moderna basada en API REST y funciones serverless nativas en Cloudflare para la gestión de agentes de IA y la consulta contextualizada de documentos jurídicos, demostrando el desacoplamiento de capas y el flujo bidireccional de servicios web.

Objetivos Específicos

1. Implementar endpoints RESTful semánticos (GET, POST, PUT, DELETE) en Cloudflare Functions que manejen códigos de estado HTTP estandarizados (200, 201, 400, 404, 409, 500).
2. Modelar y persistir la estructura de agentes, habilidades y fragmentos normativos en Cloudflare D1 con restricciones de unicidad e integridad referencial.
3. Incorporar un motor de búsqueda por texto completo (FTS5) para recuperar artículos de la Constitución e inyectarlos dinámicamente en el modelo de lenguaje de Cloudflare Workers AI.
4. Documentar el comportamiento arquitectónico de las funciones serverless y justificar la adaptación de las pruebas de disponibilidad de servicios (Prueba 6).

4. Arquitectura del Sistema

4.1. Diagrama de Capas y Flujo de Comunicación

[ CLIENTE / NAVEGADOR ]
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CAPA 1: FRONTEND (Astro UI Islands)                                    │
│ - Rutas de navegación: / (listado), /nuevo (registro), /chat/[id]      │
│ - Interfaz reactiva mediante Fetch API hacia /api/*                    │
│ - Control de estados: Carga, Validación, Error de Conexión             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     │ Peticiones HTTP / Formato JSON
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CAPA 2: BACKEND (Cloudflare Functions Nativas en Astro)                 │
│ - Endpoints en src/pages/api/agentes/                                  │
│ - Validación de esquemas, sanitización y control de errores            │
│ - Orquestación RAG Híbrido: Vectorize (Semántico) + D1 FTS5 (Léxico)   │
└──────────────┬─────────────────────────────┬───────────────────────────┘
               │ Binding: env.DB (SQL)       │ Binding: env.AI / env.VECTOR_INDEX
               ▼                             ▼
┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ CAPA 3A: BASE DE DATOS (D1)    │  │ CAPA 3B: IA Y VECTORES (Cloudflare)│
│ - Tablas relacionales (SQLite) │  │ - Workers AI: Llama 3.1 + BGE-M3   │
│ - Triggers + FTS5 sincronizado │  │ - Vectorize: Índice semántico denso│
└────────────────────────────────┘  └────────────────────────────────────┘


4.2. Tratamiento y Documentación de la "Prueba 6" (Apagar el Backend)

En la rúbrica tradicional (Sección 13), la Prueba 6 pide "apagar el backend e intentar consultar". En la arquitectura moderna serverless de Cloudflare con Astro:

⚬ Explicación Teórica: En una aplicación Serverless en el Edge, el frontend estático/SSR y las funciones de API se ejecutan bajo demanda en la misma red distribuida. No existe un proceso demonio tradicional (como apache2, mysqld o un servidor express) que pueda morir de forma aislada mientras el resto sigue activo.
⚬ Implementación de la Prueba en el Proyecto:
  1. Simulación por Middleware / Switch de Diagnóstico: Se añade un parámetro o variable de entorno (SIMULATE_BACKEND_DOWN=true o header x-mock-service-status: offline) en el middleware de las Cloudflare Functions.
  2. Al activarse, la API devuelve un fallo de red o un código 503 Service Unavailable.
  3. El frontend de Astro captura el fallo en su cliente fetch() y despliega inmediatamente en pantalla el componente visual de contingencia:
     "Error de comunicación: No fue posible conectarse con el servicio de API REST. Verifique la disponibilidad del servicio."
  4. De este modo se valida el requerimiento didáctico de resiliencia del frontend ante la caída del backend.

5. Estructura del Proyecto y Arquitectura Modular

5.1. Árbol de Directorios y Separación de Responsabilidades

PROYECTO-AGENTES-CLOUDFLARE/
│
├── src/
│   ├── env.d.ts                  # Declaración estricta de tipos de Cloudflare (D1, AI, Vectorize)
│   │
│   ├── schemas/                  # Contratos de Validación y DTOs (Zod + Drizzle-Zod)
│   │   ├── agent.schema.ts       # Esquemas de entrada/salida para Agentes
│   │   └── chat.schema.ts        # Esquemas de entrada/salida para RAG / Consultas
│   │
│   ├── db/                       # Capa de Infraestructura de Base de Datos
│   │   ├── schema.ts             # Definición de tablas y relaciones con Drizzle ORM
│   │   └── index.ts              # Factory de conexión: createDb(env.DB)
│   │
│   ├── repositories/             # Capa de Acceso a Datos (Data Access Layer)
│   │   ├── agent.repository.ts   # Operaciones CRUD sobre D1 mediante Drizzle
│   │   └── document.repository.ts# Inserción de chunks y consultas léxicas FTS5
│   │
│   ├── services/                 # Capa de Lógica de Negocio y Orquestación Edge
│   │   ├── agent.service.ts      # Casos de uso de agentes (validación de unicidad, reglas)
│   │   ├── rag.service.ts        # Pipeline RAG: BGE-M3 (Embeddings) + Vectorize + Llama 3.1
│   │   └── client/
│   │       └── apiClient.ts      # Cliente HTTP para el frontend con timeout y manejo de errores
│   │
│   ├── components/               # Capa de Presentación (UI Islands y Componentes Astro)
│   │   ├── AgentTable.astro      # Tabla de visualización reactiva (RF02)
│   │   ├── AgentForm.astro       # Formulario de registro (RF01)
│   │   ├── ChatInterface.astro   # Interfaz de consulta y streaming RAG
│   │   └── AlertBanner.astro     # Manejo visual de contingencia y red
│   │
│   ├── layouts/
│   │   └── Layout.astro          # Plantilla base y estilos globales
│   │
│   └── pages/
│       ├── index.astro           # Vista 1: Gestión y listado de agentes
│       ├── nuevo.astro           # Vista 2: Registro de nuevo agente
│       ├── chat/
│       │   └── [id].astro        # Vista 3: Interacción con el agente
│       │
│       └── api/                  # Controladores Delgados (Thin HTTP Controllers)
│           ├── agentes/
│           │   ├── index.ts      # GET (listar) y POST (crear agente)
│           │   └── [id]/
│           │       ├── index.ts  # GET (detalle), PUT (editar), DELETE (borrar)
│           │       ├── conocimiento.ts  # POST: Ingesta de archivos .md
│           │       └── consultar.ts     # POST: Consulta RAG con Workers AI
│           └── health.ts         # Endpoint de estado del servicio
│
├── database/                     # Migraciones y Evidencia SQL
│   ├── schema.sql                # DDL generado por Drizzle / triggers de Cloudflare D1
│   └── seed.sql                  # Datos maestros de habilidades y agentes
│
├── conocimiento/                 # Archivos fuente de la Constitución Política
│   ├── titulo_1_principios.md
│   ├── titulo_2_derechos.md
│   └── titulo_4_participacion.md
│
├── docs/                         # Documentación requerida para entrega
│   ├── documentacion_api.md      # Especificación completa de endpoints
│   └── arquitectura.png          # Diagrama de arquitectura de 3 capas
│
├── astro.config.mjs              # Configuración Astro + @astrojs/cloudflare
├── drizzle.config.ts             # Configuración de migraciones Drizzle para D1
├── tsconfig.json                 # Configuración estricta de TypeScript
├── wrangler.jsonc                # Declaración de bindings D1, Workers AI y Vectorize
└── package.json


5.2. Patrones de Diseño de Código Obligatorios

1. **Repository Pattern (Desacoplamiento de Persistencia):**
   - Las consultas a la base de datos se aíslan exclusivamente dentro de `src/repositories/`.
   - Ni los controladores HTTP (`src/pages/api/`) ni las vistas Astro ejecutan consultas directas a Drizzle ni SQL plano.
   - Beneficio: Si cambia el motor de persistencia o la estrategia de queries, solo se modifica el repositorio sin tocar los endpoints.

2. **Service Layer Pattern (Lógica de Negocio y Orquestación):**
   - La orquestación entre la base de datos relacional, la base vectorial (Vectorize) y el modelo de lenguaje (Workers AI) se centraliza en `src/services/`.
   - Implementa validaciones de negocio previas a la persistencia (ej. comprobación de slugs duplicados, validación de habilidades existentes).

3. **Factory & Dependency Injection Pattern (Ciclo de Vida Edge):**
   - En el runtime de Cloudflare Workers no existen variables globales ni procesos de servidor persistentes.
   - Cada servicio y repositorio recibe sus dependencias inyectadas en tiempo de ejecución a partir de `locals.runtime.env`:
     ```typescript
     const db = createDb(locals.runtime.env.DB);
     const agentRepo = new AgentRepository(db);
     const agentService = new AgentService(agentRepo);
     ```

4. **Thin Controller Pattern (Controladores HTTP Livianos):**
   - Los endpoints en `src/pages/api/` tienen una única responsabilidad: recibir la petición HTTP, validar el payload con el esquema Zod correspondiente, delegar la ejecución al servicio y formatear la respuesta HTTP con el código de estado adecuado (200, 201, 400, 404, 409, 500).

5. **Astro Islands Architecture (Container-Presentational):**
   - Los componentes de servidor se mantienen estáticos y sin JavaScript del lado del cliente.
   - Los componentes interactivos (formulario y chat) se aíslan como islas reactivas con hidratación selectiva (`client:load`).


6. Modelo de Base de Datos Relacional (database/schema.sql)

El esquema se despliega en Cloudflare D1. Incluye activación de integridad referencial, catálogo relacional, tabla FTS5 y sus respectivos triggers de sincronización automática:

-- 0. Habilitar integridad referencial en SQLite
PRAGMA foreign_keys = ON;

-- 1. Tabla de Agentes (Entidad Principal)
CREATE TABLE IF NOT EXISTS agentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(100) NOT NULL,
    modelo VARCHAR(60) NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct',
    temperatura REAL NOT NULL DEFAULT 0.2,
    system_prompt TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo de Habilidades disponibles
CREATE TABLE IF NOT EXISTS habilidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- 3. Tabla intermedia (Relación N:M Agente <-> Habilidades)
CREATE TABLE IF NOT EXISTS agente_habilidades (
    agente_id INTEGER NOT NULL,
    habilidad_id INTEGER NOT NULL,
    PRIMARY KEY (agente_id, habilidad_id),
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE,
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id) ON DELETE CASCADE
);

-- 4. Documentos y Chunks de Conocimiento (.md) asignados a cada Agente
CREATE TABLE IF NOT EXISTS agente_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER NOT NULL,
    vector_id VARCHAR(64), -- Identificador correspondiente en Cloudflare Vectorize
    nombre_archivo VARCHAR(150) NOT NULL,
    titulo_seccion VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE
);

-- 5. Tabla virtual para búsqueda léxica rápida (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documentos USING fts5(
    documento_id UNINDEXED,
    agente_id UNINDEXED,
    titulo_seccion,
    contenido
);

-- 6. Triggers para sincronización automática entre agente_documentos y fts_documentos
CREATE TRIGGER IF NOT EXISTS trg_documentos_insert AFTER INSERT ON agente_documentos BEGIN
    INSERT INTO fts_documentos (documento_id, agente_id, titulo_seccion, contenido)
    VALUES (new.id, new.agente_id, new.titulo_seccion, new.contenido);
END;

CREATE TRIGGER IF NOT EXISTS trg_documentos_delete AFTER DELETE ON agente_documentos BEGIN
    DELETE FROM fts_documentos WHERE documento_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_documentos_update AFTER UPDATE ON agente_documentos BEGIN
    UPDATE fts_documentos
    SET titulo_seccion = new.titulo_seccion, contenido = new.contenido
    WHERE documento_id = old.id;
END;


6.2. Modelo TypeScript con Drizzle ORM (src/db/schema.ts)

```typescript
import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const agentes = sqliteTable('agentes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug', { length: 60 }).notNull().unique(),
  nombre: text('nombre', { length: 100 }).notNull(),
  rol: text('rol', { length: 100 }).notNull(),
  modelo: text('modelo', { length: 60 }).notNull().default('@cf/meta/llama-3.1-8b-instruct'),
  temperatura: real('temperatura').notNull().default(0.2),
  systemPrompt: text('system_prompt').notNull(),
  activo: integer('activo').notNull().default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const habilidades = sqliteTable('habilidades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo', { length: 50 }).notNull().unique(),
  nombre: text('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
});

export const agenteHabilidades = sqliteTable('agente_habilidades', {
  agenteId: integer('agente_id')
    .notNull()
    .references(() => agentes.id, { onDelete: 'cascade' }),
  habilidadId: integer('habilidad_id')
    .notNull()
    .references(() => habilidades.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.agenteId, table.habilidadId] })
]);

export const agenteDocumentos = sqliteTable('agente_documentos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agenteId: integer('agente_id')
    .notNull()
    .references(() => agentes.id, { onDelete: 'cascade' }),
  vectorId: text('vector_id', { length: 64 }),
  nombreArchivo: text('nombre_archivo', { length: 150 }).notNull(),
  tituloSeccion: text('titulo_seccion', { length: 200 }).notNull(),
  contenido: text('contenido').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relaciones Drizzle para consultas relacionales tipeadas
export const agentesRelations = relations(agentes, ({ many }) => ({
  habilidades: many(agenteHabilidades),
  documentos: many(agenteDocumentos),
}));

export const habilidadesRelations = relations(habilidades, ({ many }) => ({
  agentes: many(agenteHabilidades),
}));

export const agenteHabilidadesRelations = relations(agenteHabilidades, ({ one }) => ({
  agente: one(agentes, {
    fields: [agenteHabilidades.agenteId],
    references: [agentes.id],
  }),
  habilidad: one(habilidades, {
    fields: [agenteHabilidades.habilidadId],
    references: [habilidades.id],
  }),
}));
```


7. Configuración de Cloudflare Functions en Astro

7.1. Configuración de Astro (astro.config.mjs)

import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true // Permite emular D1 y AI en local durante el desarrollo
    }
  })
});


7.2. Configuración de Bindings (wrangler.toml o wrangler.jsonc)

En `wrangler.toml`:
```toml
name = "proyecto-agentes-ia"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "bd_agentes"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[ai]
binding = "AI"

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "constitucion-colombia"
```

O en formato estándar moderno `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "proyecto-agentes-ia",
  "compatibility_date": "2024-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bd_agentes",
      "database_id": "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ],
  "ai": {
    "binding": "AI"
  },
  "vectorize": [
    {
      "binding": "VECTOR_INDEX",
      "index_name": "constitucion-colombia"
    }
  ]
}
```
*Comando de creación del índice Vectorize (1024 dimensiones para BGE-M3):*
```bash
npx wrangler vectorize create constitucion-colombia --dimensions=1024 --metric=cosine
```

7.3. Configuración Estricta de TypeScript y Tipado de Bindings

1. Declaración de Bindings en Runtime (`src/env.d.ts`):
Garantiza que `locals.runtime.env` no contenga tipos `any`, exponiendo los métodos de Cloudflare con autocompletado y validación de tipos:
```typescript
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
```

2. Configuración Estricta del Compilador (`tsconfig.json`):
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```


7.4. Flujo de Tipado de Extremo a Extremo (E2E Type Safety)

Para evitar la desincronización entre la base de datos, los controladores backend y los componentes del frontend, se establece una única fuente de verdad (Single Source of Truth):

1. **Tabla D1 (Drizzle):** Define el esquema con tipos exactos de SQLite en `src/db/schema.ts`.
2. **Generación de DTOs con Zod (`drizzle-zod`):** Se infieren esquemas de validación de entrada (`CreateAgentSchema`) y de salida (`SelectAgentSchema`) añadiendo validaciones de negocio adicionales:
   ```typescript
   // src/schemas/agent.schema.ts
   import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
   import { agentes } from '../db/schema';
   import { z } from 'zod';

   export const InsertAgentSchema = createInsertSchema(agentes, {
     slug: (schema) => schema.min(3).max(60).regex(/^[a-z0-9-]+$/),
     nombre: (schema) => schema.min(2).max(100),
     temperatura: (schema) => schema.min(0).max(1),
   }).extend({
     habilidades: z.array(z.string()).default([])
   });

   export type CreateAgentDTO = z.infer<typeof InsertAgentSchema>;
   ```
3. **Validación en Controladores:** Los endpoints validan el request con `InsertAgentSchema.safeParse(body)`. Si falla, se devuelve un código 400 con los errores estructurados de Zod.
4. **Consumo en Frontend (`apiClient.ts`):** Las llamadas `fetch` del cliente importan y utilizan los tipos `CreateAgentDTO` y `SelectAgentDTO`, asegurando que cualquier cambio en la base de datos sea detectado en tiempo de compilación tanto en el backend como en los componentes de la interfaz.


8. Especificación de la API REST

8.1. Matriz de Servicios Web

Método	Endpoint	Acción	Código HTTP
GET	/api/agentes	Consultar todos los agentes	200 OK
POST	/api/agentes	Registrar un nuevo agente	201 Created / 400 Bad Request / 409 Conflict
GET	/api/agentes/[id]	Obtener detalle de un agente	200 OK / 404 Not Found
PUT	/api/agentes/[id]	Actualizar parámetros del agente	200 OK / 400 Bad Request
DELETE	/api/agentes/[id]	Eliminar agente y dependencias	200 OK / 404 Not Found
POST	/api/agentes/[id]/conocimiento	Ingestar archivo .md a la base de conocimiento	201 Created / 400 Bad Request
POST	/api/agentes/[id]/consultar	Consulta con RAG y respuesta de IA	200 OK / 400 Bad Request / 500 Server Error

8.2. Ejemplo de Implementación en Cloudflare Function con Drizzle ORM (src/pages/api/agentes/index.ts)

```typescript
import type { APIRoute } from 'astro';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../db/schema';
import { inArray } from 'drizzle-orm';

export const prerender = false;

// GET: Consultar agentes con sus habilidades vinculadas
export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  try {
    const db = drizzle(env.DB, { schema });
    const listaAgentes = await db.query.agentes.findMany({
      orderBy: (agentes, { desc }) => [desc(agentes.createdAt)],
      with: {
        habilidades: {
          with: {
            habilidad: true,
          },
        },
      },
    });

    // Formatear respuesta plana para el cliente frontend
    const results = listaAgentes.map((a) => ({
      ...a,
      habilidades: a.habilidades.map((h) => h.habilidad.codigo).join(','),
    }));

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

// POST: Registrar agente
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  try {
    const body = await request.json();
    const { slug, nombre, rol, modelo, temperatura, system_prompt, habilidades } = body;

    // Validación de campos obligatorios
    if (!slug || !nombre || !rol || !system_prompt) {
      return new Response(
        JSON.stringify({ success: false, message: 'Faltan campos obligatorios' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = drizzle(env.DB, { schema });

    // Inserción tipeada del agente en D1
    const [nuevoAgente] = await db.insert(schema.agentes).values({
      slug,
      nombre,
      rol,
      modelo: modelo || '@cf/meta/llama-3.1-8b-instruct',
      temperatura: temperatura ?? 0.2,
      systemPrompt: system_prompt,
    }).returning({ id: schema.agentes.id });

    // Vinculación atómica de habilidades en un solo batch
    if (Array.isArray(habilidades) && habilidades.length > 0) {
      const habsEncontradas = await db
        .select({ id: schema.habilidades.id })
        .from(schema.habilidades)
        .where(inArray(schema.habilidades.codigo, habilidades));

      if (habsEncontradas.length > 0) {
        const batchInserts = habsEncontradas.map((h) =>
          db.insert(schema.agenteHabilidades).values({
            agenteId: nuevoAgente.id,
            habilidadId: h.id,
          }).onConflictDoNothing()
        );
        await db.batch(batchInserts as [any, ...any[]]);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Agente registrado exitosamente', id: nuevoAgente.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return new Response(
        JSON.stringify({ success: false, message: 'El identificador (slug) ya existe' }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno en el servidor' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```


9. Mecánica de Habilidades y RAG Constitucional Óptimo (/api/agentes/[id]/consultar.ts)

El flujo de RAG en el Edge combina búsqueda vectorial semántica (Cloudflare Vectorize) con búsqueda léxica (D1 FTS5) para máxima precisión en terminología jurídica:

9.1. Ingesta de Documentos (.md):
1. **Extracción y Chunking:** Se divide el archivo `.md` de la Constitución en secciones lógicas (por títulos y artículos).
2. **Generación de Embeddings:** Se generan vectores de 1024 dimensiones con Workers AI usando el modelo multilingüe `@cf/baai/bge-m3`:
   ```typescript
   const { data } = await env.AI.run('@cf/baai/bge-m3', { text: [chunk.contenido] });
   const vector = data[0];
   ```
3. **Indexación Vectorial:** Se inserta el vector en Cloudflare Vectorize vinculando el `agente_id`:
   ```typescript
   await env.VECTOR_INDEX.upsert([{ id: vectorId, values: vector, metadata: { agente_id, titulo } }]);
   ```
4. **Persistencia Relacional:** Se guarda el registro en `agente_documentos` de D1, disparando el trigger que actualiza automáticamente `fts_documentos`.

9.2. Consulta e Inferencia:
1. **Recepción y Sanitización:** El endpoint recibe `{ "pregunta": "¿Qué dice la Constitución sobre el derecho a la vida?" }`.
2. **Búsqueda Semántica:** Se genera el embedding de la pregunta con `@cf/baai/bge-m3` y se consulta Vectorize:
   ```typescript
   const matches = await env.VECTOR_INDEX.query(queryVector, { topK: 3, filter: { agente_id: id } });
   ```
3. **Búsqueda Léxica de Respaldo (FTS5):** Para consultas con números de artículo específicos (ej. "Artículo 86"), se sanitizan caracteres especiales (`"`, `*`, `(`, `)`) y se consulta `fts_documentos` mediante `MATCH`.
4. **Construcción del Prompt Aumentado:**
   ```markdown
   [SYSTEM PROMPT DEL AGENTE]: Eres un asesor legal constitucional especializado en la Carta Magna de Colombia...
   
   [CONTEXTO RECUPERADO (VECTORIZE + D1)]:
   - Título II, Artículo 11: El derecho a la vida es inviolable. No habrá pena de muerte.
   
   [PREGUNTA DEL USUARIO]: ¿Qué dice la Constitución sobre el derecho a la vida?
   ```
5. **Inferencia y Streaming (SSE):** Se ejecuta Workers AI con `@cf/meta/llama-3.1-8b-instruct`. Se activa `stream: true` para devolver un flujo Server-Sent Events (`text/event-stream`), permitiendo que el componente `ChatInterface.astro` renderice la respuesta palabra por palabra sin latencia percibida.

10. Plan de Pruebas y Cumplimiento de la Guía

Prueba	Objetivo	Acción	Resultado Verificado
Prueba 1	Consultar agentes	Acceder a la raíz /	La tabla renderiza los agentes consultados vía GET /api/agentes.
Prueba 2	Registro correcto	Enviar formulario con datos válidos	Código 201, agente guardado en D1 y listado actualizado.
Prueba 3	Validación de campos	Dejar campos obligatorios vacíos	Código 400 y alerta visual en el formulario sin escribir en la BD.
Prueba 4	Restricción de duplicados	Intentar registrar con un slug ya existente	Código 409 Conflict y mensaje de advertencia.
Prueba 5	Consulta RAG con .md	Preguntar sobre un derecho fundamental	El agente responde fundamentando con el artículo exacto del archivo .md.
Prueba 6	Desconexión del servicio	Activar modo offline en simulación	El Frontend muestra: "No fue posible conectarse con el servidor".

11. Entregables de la Actividad

1. Evidencia 1 (Código Fuente): Proyecto completo estructurado en Astro con endpoints en src/pages/api/.
2. Evidencia 2 (Base de Datos): Archivos database/schema.sql y database/seed.sql ejecutables en Cloudflare D1.
3. Evidencia 3 (Documentación de API): Especificación técnica (docs/documentacion_api.md) con esquemas JSON, parámetros de URL y códigos HTTP.
4. Evidencia 4 (Diagrama de Arquitectura): Diagrama explicativo del flujo Astro (UI) ➔ Cloudflare Function (REST) ➔ D1 / Workers AI.
5. Evidencia 5 (Demostración en Video): Video demostrativo evidenciando el CRUD completo, la ingesta de los archivos .md de la Constitución y la gestión de errores de conexión.