# Especificación Técnica de API REST: Sistema de Agentes Constitucionales

API REST desarrollada sobre Cloudflare Functions nativas integradas con Astro (modo SSR) para la administración y orquestación RAG de Agentes de IA especializados en la Constitución Política de Colombia de 1991.

---

## 1. Convenciones Generales

- **Base URL:** `/api`
- **Formato de Intercambio:** `application/json`
- **Manejo de Errores Estandarizado:**
  - `200 OK`: Petición exitosa.
  - `201 Created`: Recurso creado exitosamente.
  - `400 Bad Request`: Error de validación en parámetros o payload JSON.
  - `404 Not Found`: Recurso o entidad no encontrada.
  - `409 Conflict`: Violación de restricción de unicidad (ej. slug duplicado).
  - `500 Internal Server Error`: Falla no controlada en el entorno serverless.

---

## 2. Matriz de Servicios Web

| Método | Endpoint | Acción | Código HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/agentes` | Listar todos los agentes y sus habilidades | `200 OK` |
| `POST` | `/api/agentes` | Registrar un nuevo agente con habilidades | `201 Created`, `400`, `409` |
| `GET` | `/api/agentes/:id` | Obtener detalle de un agente y sus documentos | `200 OK`, `404` |
| `PUT` | `/api/agentes/:id` | Actualizar configuración de un agente | `200 OK`, `400`, `404`, `409` |
| `DELETE` | `/api/agentes/:id` | Eliminar agente y dependencias en cascada | `200 OK`, `404` |
| `POST` | `/api/agentes/:id/conocimiento` | Ingestar e indexar archivo `.md` (D1 + Vectorize) | `201 Created`, `400`, `404` |
| `POST` | `/api/agentes/:id/consultar` | Consulta RAG híbrida (Vectorize + FTS5 + Workers AI) | `200 OK`, `400`, `404`, `500` |
| `GET` | `/api/habilidades` | Catálogo maestro de habilidades disponibles | `200 OK` |

---

## 3. Detalle de Endpoints

### 3.1. Listar Agentes
- **Endpoint:** `GET /api/agentes`
- **Respuesta (200 OK):**
```json
[
  {
    "id": 1,
    "slug": "constitucional-co",
    "nombre": "ConstitucionalBot Colombia",
    "rol": "Asesor Jurídico Constitucional Senior",
    "modelo": "@cf/meta/llama-3.1-8b-instruct",
    "temperatura": 0.2,
    "systemPrompt": "Eres un asesor legal...",
    "activo": 1,
    "createdAt": "2026-09-16 17:00:00",
    "habilidades": "CONSTITUCIONAL,DERECHOS_FUNDAMENTALES,TUTELA",
    "documentosCount": 3
  }
]
```

---

### 3.2. Registrar Agente
- **Endpoint:** `POST /api/agentes`
- **Headers:** `Content-Type: application/json`
- **Payload:**
```json
{
  "slug": "asesor-tutelas",
  "nombre": "Especialista en Acción de Tutela",
  "rol": "Asesor de Garantías Constitucionales",
  "modelo": "@cf/meta/llama-3.1-8b-instruct",
  "temperatura": 0.15,
  "systemPrompt": "Eres un asistente legal experto en la tramitación del Artículo 86 constitucional.",
  "habilidades": ["CONSTITUCIONAL", "TUTELA", "DERECHOS_FUNDAMENTALES"]
}
```
- **Respuesta (201 Created):**
```json
{
  "success": true,
  "message": "Agente registrado exitosamente",
  "id": 2
}
```
- **Respuesta (409 Conflict):**
```json
{
  "success": false,
  "message": "El identificador (slug) \"asesor-tutelas\" ya está registrado"
}
```

---

### 3.3. Detalle de Agente
- **Endpoint:** `GET /api/agentes/:id`
- **Respuesta (200 OK):**
```json
{
  "id": 1,
  "slug": "constitucional-co",
  "nombre": "ConstitucionalBot Colombia",
  "rol": "Asesor Jurídico Constitucional Senior",
  "modelo": "@cf/meta/llama-3.1-8b-instruct",
  "temperatura": 0.2,
  "systemPrompt": "...",
  "activo": 1,
  "habilidades": "CONSTITUCIONAL,TUTELA",
  "documentos": [
    {
      "id": 1,
      "nombreArchivo": "titulo_2_derechos.md",
      "tituloSeccion": "Artículo 86: Acción de Tutela",
      "createdAt": "2026-09-16 17:15:00"
    }
  ]
}
```

---

### 3.4. Actualizar Agente
- **Endpoint:** `PUT /api/agentes/:id`
- **Payload:**
```json
{
  "nombre": "ConstitucionalBot Pro Colombia",
  "temperatura": 0.25,
  "habilidades": ["CONSTITUCIONAL", "TUTELA", "MECANISMOS_PARTICIPACION"]
}
```
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "message": "Agente actualizado exitosamente"
}
```

---

### 3.5. Eliminar Agente
- **Endpoint:** `DELETE /api/agentes/:id`
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "message": "Agente eliminado exitosamente"
}
```

---

### 3.6. Ingestar Archivo `.md` a la Base de Conocimiento
- **Endpoint:** `POST /api/agentes/:id/conocimiento`
- **Payload:**
```json
{
  "nombreArchivo": "titulo_2_derechos.md",
  "contenido": "# Título II\n\n## Artículo 11: Derecho a la Vida\nEl derecho a la vida es inviolable. No habrá pena de muerte."
}
```
- **Respuesta (201 Created):**
```json
{
  "success": true,
  "message": "Documento ingestado e indexado exitosamente en D1 y Vectorize",
  "chunksIngested": 1,
  "sections": ["Artículo 11: Derecho a la Vida"]
}
```

---

### 3.7. Consulta RAG Constitucional e Inferencia IA
- **Endpoint:** `POST /api/agentes/:id/consultar`
- **Payload:**
```json
{
  "pregunta": "¿Qué establece la Constitución colombiana sobre el derecho a la vida y la pena de muerte?",
  "stream": false
}
```
- **Respuesta (200 OK):**
```json
{
  "success": true,
  "agente": {
    "id": 1,
    "nombre": "ConstitucionalBot Colombia",
    "rol": "Asesor Jurídico Constitucional Senior",
    "modelo": "@cf/meta/llama-3.1-8b-instruct"
  },
  "pregunta": "¿Qué establece la Constitución colombiana sobre el derecho a la vida y la pena de muerte?",
  "respuesta": "Conforme al Artículo 11 de la Constitución Política de Colombia de 1991, el derecho a la vida es inviolable y se prohíbe de manera categórica la pena de muerte en todo el territorio nacional.",
  "citas": [
    {
      "titulo": "Artículo 11: Derecho a la Vida",
      "contenido": "El derecho a la vida es inviolable. No habrá pena de muerte.",
      "origen": "lexico"
    }
  ],
  "isLiveAI": true
}
```

---

## 4. Ejemplos con cURL

### Crear Agente
```bash
curl -X POST http://localhost:4321/api/agentes \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "defensor-pueblo",
    "nombre": "Defensor de Derechos Humanos",
    "rol": "Garante de Derechos Fundamentales",
    "systemPrompt": "Eres un defensor enfocado en el debido proceso y la dignidad humana.",
    "habilidades": ["CONSTITUCIONAL", "DERECHOS_FUNDAMENTALES"]
  }'
```

### Consultar RAG
```bash
curl -X POST http://localhost:4321/api/agentes/1/consultar \
  -H "Content-Type: application/json" \
  -d '{
    "pregunta": "¿Qué artículo consagra la acción de tutela y en qué consiste?"
  }'
```
