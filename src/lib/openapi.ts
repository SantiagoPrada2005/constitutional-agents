/**
 * Especificación OpenAPI 3.1.0 para la API REST del Orquestador de Agentes Constitucionales
 * Plataforma: Astro SSR en Cloudflare Workers Edge (D1 + Vectorize + Workers AI)
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Constitutional AI Agent Orchestrator API',
    version: '1.0.0',
    description: `
API REST de alto rendimiento ejecutada en el Edge de Cloudflare con Astro (modo SSR).
Proporciona administración completa de agentes de inteligencia artificial y orquestación
RAG híbrida (búsqueda vectorial en **Cloudflare Vectorize** + búsqueda léxica en **D1 SQLite FTS5**
e inferencia con **Workers AI** basada en Llama 4 Scout / Llama 3.1) especializados en la
Constitución Política de Colombia de 1991.

### Características Clave:
- **Gestión de Agentes:** Ciclo de vida CRUD con asignación de habilidades constitucionales.
- **RAG Constitucional:** Ingesta semántica y particionado de normas jurídicas en Markdown.
- **Inferencia en Tiempo Real:** Respuestas fundamentadas con citas jurídicas y soporte para streaming SSE.
- **Catálogo de Habilidades:** Habilidades maestras para el dominio constitucional y legal.
    `.trim(),
    contact: {
      name: 'Equipo de Ingeniería Constitutional AI',
      url: 'https://github.com/SantiagoPrada2005/constitutional-agents'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Servidor Actual (Edge / Localhost)'
    },
    {
      url: 'http://localhost:4321',
      description: 'Entorno de Desarrollo Local (Astro Dev)'
    }
  ],
  tags: [
    {
      name: 'Agentes',
      description: 'Operaciones de ciclo de vida (CRUD) y configuración de agentes constitucionales.'
    },
    {
      name: 'Conocimiento (RAG)',
      description: 'Ingesta documental de normas Markdown, particionado, vectorización e indexación en D1 y Vectorize.'
    },
    {
      name: 'Inferencia & Chat',
      description: 'Consultas jurídicas fundamentadas con RAG híbrido y generación de lenguaje con Workers AI.'
    },
    {
      name: 'Habilidades',
      description: 'Catálogo de especialidades jurídicas y competencias disponibles para vincular a los agentes.'
    }
  ],
  paths: {
    '/api/agentes': {
      get: {
        tags: ['Agentes'],
        summary: 'Listar todos los agentes',
        description: 'Obtiene el listado completo de agentes registrados en D1 junto con sus habilidades asociadas y número de documentos de conocimiento vinculados.',
        operationId: 'getAllAgents',
        responses: {
          '200': {
            description: 'Lista de agentes obtenida exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/AgentDetail'
                  }
                },
                example: [
                  {
                    id: 1,
                    slug: 'constitucional-co',
                    nombre: 'ConstitucionalBot Colombia',
                    rol: 'Asesor Jurídico Constitucional Senior',
                    modelo: '@cf/meta/llama-4-scout-17b-16e-instruct',
                    temperatura: 0.2,
                    systemPrompt: 'Eres un asesor legal experto en la Constitución Política de Colombia de 1991.',
                    activo: 1,
                    createdAt: '2026-09-16 17:00:00',
                    habilidades: 'CONSTITUCIONAL,DERECHOS_FUNDAMENTALES,TUTELA',
                    documentosCount: 3
                  }
                ]
              }
            }
          },
          '500': {
            description: 'Error interno en el servidor o base de datos D1 no disponible.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Agentes'],
        summary: 'Registrar un nuevo agente',
        description: 'Crea un nuevo agente constitucional con validación estricta de parámetros en Zod y vinculación automática de habilidades.',
        operationId: 'createAgent',
        requestBody: {
          required: true,
          description: 'Datos de configuración del nuevo agente.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateAgentInput'
              },
              example: {
                slug: 'asesor-tutelas',
                nombre: 'Especialista en Acción de Tutela',
                rol: 'Asesor de Garantías Constitucionales',
                modelo: '@cf/meta/llama-4-scout-17b-16e-instruct',
                temperatura: 0.2,
                systemPrompt: 'Eres un asistente legal experto en la tramitación y fundamentación del Artículo 86 constitucional colombiano.',
                activo: 1,
                habilidades: ['CONSTITUCIONAL', 'TUTELA', 'DERECHOS_FUNDAMENTALES']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Agente registrado exitosamente en D1.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Agente registrado exitosamente' },
                    data: { $ref: '#/components/schemas/Agent' },
                    id: { type: 'integer', example: 2 }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Error de validación en los campos requeridos o payload JSON inválido.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse'
                }
              }
            }
          },
          '409': {
            description: 'Conflicto: El slug especificado ya existe en el sistema.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'El identificador (slug) ya existe'
                }
              }
            }
          },
          '500': {
            description: 'Falla no controlada en el entorno serverless.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/agentes/{id}': {
      get: {
        tags: ['Agentes'],
        summary: 'Obtener detalle de un agente por ID',
        description: 'Recupera los datos completos de configuración de un agente junto a la lista de documentos y fragmentos de conocimiento asociados.',
        operationId: 'getAgentById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador numérico único del agente.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Detalle del agente recuperado exitosamente.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AgentDetailWithDocs'
                },
                example: {
                  id: 1,
                  slug: 'constitucional-co',
                  nombre: 'ConstitucionalBot Colombia',
                  rol: 'Asesor Jurídico Constitucional Senior',
                  modelo: '@cf/meta/llama-4-scout-17b-16e-instruct',
                  temperatura: 0.2,
                  systemPrompt: 'Eres un asesor legal experto en la Constitución Política de Colombia de 1991.',
                  activo: 1,
                  habilidades: 'CONSTITUCIONAL,TUTELA',
                  documentos: [
                    {
                      id: 1,
                      nombreArchivo: 'titulo_2_derechos.md',
                      tituloSeccion: 'Artículo 86: Acción de Tutela',
                      createdAt: '2026-09-16 17:15:00'
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'ID de agente inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'El agente no fue encontrado en la base de datos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  message: 'Agente con ID 999 no encontrado'
                }
              }
            }
          },
          '500': {
            description: 'Error interno en el servidor.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Agentes'],
        summary: 'Actualizar configuración de un agente',
        description: 'Modifica de forma parcial o total los parámetros, prompt de sistema o habilidades asignadas a un agente.',
        operationId: 'updateAgent',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador del agente a actualizar.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        requestBody: {
          required: true,
          description: 'Campos del agente a modificar (todos opcionales).',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateAgentInput'
              },
              example: {
                nombre: 'ConstitucionalBot Pro Colombia',
                temperatura: 0.25,
                habilidades: ['CONSTITUCIONAL', 'TUTELA', 'MECANISMOS_PARTICIPACION']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Agente actualizado exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Agente actualizado exitosamente' },
                    data: { $ref: '#/components/schemas/Agent' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Parámetros o payload JSON inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '409': {
            description: 'Conflicto de unicidad en el nuevo slug solicitado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error del servidor.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Agentes'],
        summary: 'Eliminar un agente y sus dependencias',
        description: 'Elimina permanentemente el agente de D1 SQLite, junto con sus vínculos de habilidades y documentos de conocimiento asociados.',
        operationId: 'deleteAgent',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador del agente a eliminar.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Agente eliminado exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Agente eliminado exitosamente' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'ID de agente inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error del servidor.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/agentes/{id}/conocimiento': {
      get: {
        tags: ['Conocimiento (RAG)'],
        summary: 'Consultar fragmentos de conocimiento del agente',
        description: 'Obtiene los documentos y chunks indexados para un agente específico, con capacidad opcional de filtrar por dominio temático o recuperar todo el catálogo transversal.',
        operationId: 'getKnowledgeChunks',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador numérico del agente.',
            schema: { type: 'integer', example: 1 }
          },
          {
            name: 'dominio',
            in: 'query',
            required: false,
            description: 'Filtrar fragmentos por dominio (ej: constitucional, transversal, tutelas).',
            schema: { type: 'string', example: 'constitucional' }
          },
          {
            name: 'all',
            in: 'query',
            required: false,
            description: 'Si es true, recupera hasta 100 fragmentos globales de todos los dominios (*).',
            schema: { type: 'boolean', example: false }
          }
        ],
        responses: {
          '200': {
            description: 'Fragmentos recuperados exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 1 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DocumentChunk' }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'ID de agente inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error del servidor.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Conocimiento (RAG)'],
        summary: 'Ingestar e indexar archivo Markdown',
        description: 'Parsea un documento Markdown por encabezados (`#`, `##`), genera embeddings densos de 1024 dimensiones con `@cf/baai/bge-m3` en Cloudflare Workers AI, indexa los vectores en Cloudflare Vectorize e inserta los fragmentos en D1 SQLite con sincronización FTS5 para búsqueda semántica híbrida.',
        operationId: 'ingestKnowledgeDocument',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del agente al cual asociar el conocimiento.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        requestBody: {
          required: true,
          description: 'Estructura con el nombre de archivo, contenido Markdown y metadatos.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/IngestDocumentInput'
              },
              example: {
                nombreArchivo: 'titulo_2_derechos.md',
                contenido: '# Título II: De los derechos, las garantías y los deberes\n\n## Artículo 11: Derecho a la Vida\nEl derecho a la vida es inviolable. No habrá pena de muerte.\n\n## Artículo 86: Acción de Tutela\nToda persona tendrá acción de tutela para reclamar ante los jueces...',
                dominio: 'constitucional'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Documento ingestado e indexado en D1 y Vectorize.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Documento ingestado e indexado exitosamente en D1 y Vectorize' },
                    chunksIngested: { type: 'integer', example: 2 },
                    sections: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['Artículo 11: Derecho a la Vida', 'Artículo 86: Acción de Tutela']
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Datos de documento inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error durante la ingesta documental o inferencia de embeddings.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Conocimiento (RAG)'],
        summary: 'Modificar una sección/fragmento de conocimiento',
        description: 'Actualiza el título, contenido textual o dominio de un fragmento de conocimiento existente, re-indexando automáticamente su vector en Cloudflare Vectorize.',
        operationId: 'updateKnowledgeChunk',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del agente propietario.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        requestBody: {
          required: true,
          description: 'Datos de actualización del fragmento (documentoId o id requerido).',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateDocumentChunkInput'
              },
              example: {
                documentoId: 1,
                tituloSeccion: 'Artículo 86: Acción de Tutela (Actualizado)',
                contenido: 'Toda persona tendrá acción de tutela para reclamar ante los jueces, en todo momento y lugar...',
                dominio: 'tutelas'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Sección de conocimiento actualizada exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Sección de conocimiento actualizada exitosamente' },
                    data: { $ref: '#/components/schemas/DocumentChunk' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Datos de actualización inválidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente o fragmento de documento no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error al actualizar la sección.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Conocimiento (RAG)'],
        summary: 'Eliminar una sección de conocimiento',
        description: 'Remueve un fragmento específico de D1 SQLite y purga su embedding asociado en el índice Cloudflare Vectorize.',
        operationId: 'deleteKnowledgeChunk',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del agente.',
            schema: { type: 'integer', example: 1 }
          },
          {
            name: 'documentoId',
            in: 'query',
            required: false,
            description: 'ID del fragmento a eliminar (también puede ser provisto en el body como JSON).',
            schema: { type: 'integer', example: 1 }
          }
        ],
        requestBody: {
          required: false,
          description: 'Alternativamente, puede enviarse en el cuerpo de la petición.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  documentoId: { type: 'integer', example: 1 },
                  id: { type: 'integer', example: 1 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Sección de conocimiento eliminada exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Sección de conocimiento eliminada exitosamente' },
                    documentoId: { type: 'integer', example: 1 }
                  }
                }
              }
            }
          },
          '400': {
            description: 'documentoId válido no especificado o inválido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente o fragmento no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error al eliminar sección.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/agentes/{id}/consultar': {
      post: {
        tags: ['Inferencia & Chat'],
        summary: 'Consulta RAG híbrida e inferencia con Workers AI',
        description: `
Ejecuta una consulta jurídica constitucional completa:
1. Extrae embeddings de la pregunta del usuario con BGE-M3.
2. Realiza búsqueda semántica en **Cloudflare Vectorize** (Top K con filtro de similitud).
3. Realiza búsqueda de texto completo léxica en **D1 FTS5 SQLite**.
4. Fusiona y desduplica los fragmentos constitucionales relevantes.
5. Inyecta el contexto normativo junto con el system prompt constitucional al modelo LLM (**Workers AI**: Llama 4 Scout / Llama 3.1).
6. Retorna la respuesta en formato JSON estructurado con citas de los artículos, o como un stream de eventos SSE (\`text/event-stream\`) si \`stream: true\`.
        `.trim(),
        operationId: 'queryAgentRAG',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del agente al cual formular la consulta jurídica.',
            schema: { type: 'integer', example: 1 }
          }
        ],
        requestBody: {
          required: true,
          description: 'Pregunta del usuario y bandera de transmisión streaming.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ChatQueryInput'
              },
              example: {
                pregunta: '¿Qué establece la Constitución colombiana sobre el derecho a la vida y la pena de muerte?',
                stream: false
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Respuesta generada exitosamente con citas normativas, o stream SSE.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ChatQueryResponse'
                },
                example: {
                  success: true,
                  agente: {
                    id: 1,
                    nombre: 'ConstitucionalBot Colombia',
                    rol: 'Asesor Jurídico Constitucional Senior',
                    modelo: '@cf/meta/llama-4-scout-17b-16e-instruct'
                  },
                  modeloUsado: '@cf/meta/llama-4-scout-17b-16e-instruct',
                  pregunta: '¿Qué establece la Constitución colombiana sobre el derecho a la vida y la pena de muerte?',
                  respuesta: 'De acuerdo con el Artículo 11 de la Constitución Política de Colombia de 1991, el derecho a la vida es inviolable. En concordancia con los tratados internacionales de derechos humanos, la Constitución prohíbe de forma taxativa y perentoria la pena de muerte en todo el territorio nacional.',
                  citas: [
                    {
                      titulo: 'Artículo 11: Derecho a la Vida',
                      contenido: 'El derecho a la vida es inviolable. No habrá pena de muerte.',
                      origen: 'vectorial'
                    }
                  ],
                  isLiveAI: true
                }
              },
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Flujo continuo Server-Sent Events (SSE) con tokens generados por Workers AI.'
                }
              }
            }
          },
          '400': {
            description: 'Validación de consulta fallida (ej. pregunta menor a 3 caracteres).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Agente no encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Error durante la inferencia RAG.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/habilidades': {
      get: {
        tags: ['Habilidades'],
        summary: 'Catálogo maestro de habilidades',
        description: 'Retorna todas las habilidades constitucionales y jurídicas preconfiguradas en el sistema para asignación a los agentes.',
        operationId: 'getAllSkills',
        responses: {
          '200': {
            description: 'Catálogo de habilidades obtenido exitosamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Skill'
                  }
                },
                example: [
                  {
                    id: 1,
                    codigo: 'CONSTITUCIONAL',
                    nombre: 'Derecho Constitucional',
                    descripcion: 'Conocimiento dogmático y orgánico de la Carta Magna de Colombia de 1991'
                  },
                  {
                    id: 2,
                    codigo: 'DERECHOS_FUNDAMENTALES',
                    nombre: 'Derechos Fundamentales',
                    descripcion: 'Protección y análisis de derechos de primera generación'
                  },
                  {
                    id: 3,
                    codigo: 'TUTELA',
                    nombre: 'Acción de Tutela',
                    descripcion: 'Mecanismo constitucional de amparo previsto en el Artículo 86'
                  },
                  {
                    id: 4,
                    codigo: 'MECANISMOS_PARTICIPACION',
                    nombre: 'Mecanismos de Participación',
                    descripcion: 'Plebiscito, referendo, consulta popular, cabildo abierto e iniciativa popular'
                  }
                ]
              }
            }
          },
          '500': {
            description: 'Error al consultar habilidades o base de datos D1 inaccesible.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          slug: { type: 'string', example: 'constitucional-co' },
          nombre: { type: 'string', example: 'ConstitucionalBot Colombia' },
          rol: { type: 'string', example: 'Asesor Jurídico Constitucional Senior' },
          modelo: { type: 'string', example: '@cf/meta/llama-4-scout-17b-16e-instruct' },
          temperatura: { type: 'number', format: 'float', example: 0.2 },
          systemPrompt: { type: 'string', example: 'Eres un asesor legal experto...' },
          activo: { type: 'integer', example: 1 },
          createdAt: { type: 'string', example: '2026-09-16 17:00:00' }
        }
      },
      AgentDetail: {
        allOf: [
          { $ref: '#/components/schemas/Agent' },
          {
            type: 'object',
            properties: {
              habilidades: { type: 'string', example: 'CONSTITUCIONAL,TUTELA' },
              documentosCount: { type: 'integer', example: 3 }
            }
          }
        ]
      },
      AgentDetailWithDocs: {
        allOf: [
          { $ref: '#/components/schemas/Agent' },
          {
            type: 'object',
            properties: {
              habilidades: { type: 'string', example: 'CONSTITUCIONAL,TUTELA' },
              documentos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    nombreArchivo: { type: 'string', example: 'titulo_2_derechos.md' },
                    tituloSeccion: { type: 'string', example: 'Artículo 86: Acción de Tutela' },
                    createdAt: { type: 'string', example: '2026-09-16 17:15:00' }
                  }
                }
              }
            }
          }
        ]
      },
      CreateAgentInput: {
        type: 'object',
        required: ['slug', 'nombre', 'rol', 'systemPrompt'],
        properties: {
          slug: {
            type: 'string',
            minLength: 3,
            maxLength: 60,
            pattern: '^[a-z0-9-]+$',
            description: 'Identificador único en minúsculas, números y guiones.',
            example: 'asesor-tutelas'
          },
          nombre: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            description: 'Nombre visible del agente.',
            example: 'Especialista en Acción de Tutela'
          },
          rol: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            description: 'Rol o especialidad jurídica.',
            example: 'Asesor de Garantías Constitucionales'
          },
          modelo: {
            type: 'string',
            default: '@cf/meta/llama-4-scout-17b-16e-instruct',
            description: 'Identificador del modelo en Workers AI.',
            example: '@cf/meta/llama-4-scout-17b-16e-instruct'
          },
          temperatura: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.2,
            description: 'Grado de creatividad/determinismo de la inferencia.',
            example: 0.2
          },
          systemPrompt: {
            type: 'string',
            minLength: 10,
            description: 'Instrucciones constitucionales directrices del comportamiento.',
            example: 'Eres un asistente legal experto en la tramitación del Artículo 86 constitucional.'
          },
          activo: {
            type: 'integer',
            default: 1,
            enum: [0, 1],
            description: '1 para activo, 0 para inactivo.',
            example: 1
          },
          habilidades: {
            type: 'array',
            items: { type: 'string' },
            description: 'Códigos de habilidades a vincular.',
            example: ['CONSTITUCIONAL', 'TUTELA', 'DERECHOS_FUNDAMENTALES']
          }
        }
      },
      UpdateAgentInput: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            minLength: 3,
            maxLength: 60,
            pattern: '^[a-z0-9-]+$'
          },
          nombre: { type: 'string', minLength: 2, maxLength: 100 },
          rol: { type: 'string', minLength: 2, maxLength: 100 },
          modelo: { type: 'string' },
          temperatura: { type: 'number', minimum: 0, maximum: 1 },
          systemPrompt: { type: 'string', minLength: 10 },
          activo: { type: 'integer', enum: [0, 1] },
          habilidades: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      DocumentChunk: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          agenteId: { type: 'integer', nullable: true, example: 1 },
          nombreArchivo: { type: 'string', example: 'titulo_2_derechos.md' },
          tituloSeccion: { type: 'string', example: 'Artículo 11: Derecho a la Vida' },
          contenido: { type: 'string', example: 'El derecho a la vida es inviolable. No habrá pena de muerte.' },
          dominio: { type: 'string', example: 'constitucional' },
          habilidadId: { type: 'integer', nullable: true, example: 1 },
          vectorId: { type: 'string', example: 'vec-doc-1' },
          createdAt: { type: 'string', example: '2026-09-16 17:10:00' }
        }
      },
      IngestDocumentInput: {
        type: 'object',
        required: ['nombreArchivo', 'contenido'],
        properties: {
          nombreArchivo: {
            type: 'string',
            minLength: 1,
            description: 'Nombre del archivo fuente (ej: constitucion_1991.md).',
            example: 'titulo_2_derechos.md'
          },
          contenido: {
            type: 'string',
            minLength: 10,
            description: 'Texto en formato Markdown con encabezados.',
            example: '# Título II\n\n## Artículo 11: Derecho a la Vida\nEl derecho a la vida es inviolable. No habrá pena de muerte.'
          },
          dominio: {
            type: 'string',
            default: 'transversal',
            description: 'Categoría jurídica o transversal de los fragmentos.',
            example: 'constitucional'
          },
          habilidadId: {
            type: 'integer',
            description: 'ID opcional de la habilidad relacionada.',
            example: 1
          }
        }
      },
      UpdateDocumentChunkInput: {
        type: 'object',
        properties: {
          documentoId: {
            type: 'integer',
            description: 'ID de la sección en base de datos D1.',
            example: 1
          },
          id: {
            type: 'integer',
            description: 'Alias de documentoId.',
            example: 1
          },
          tituloSeccion: {
            type: 'string',
            minLength: 1,
            example: 'Artículo 86: Acción de Tutela (Actualizado)'
          },
          contenido: {
            type: 'string',
            minLength: 5,
            example: 'Toda persona tendrá acción de tutela para reclamar ante los jueces...'
          },
          dominio: {
            type: 'string',
            example: 'tutelas'
          }
        }
      },
      ChatQueryInput: {
        type: 'object',
        required: ['pregunta'],
        properties: {
          pregunta: {
            type: 'string',
            minLength: 3,
            description: 'Interrogante o caso legal a consultar contra la base de conocimiento.',
            example: '¿Qué establece la Constitución colombiana sobre el derecho a la vida y la pena de muerte?'
          },
          stream: {
            type: 'boolean',
            default: true,
            description: 'true para recibir Server-Sent Events, false para recibir JSON unificado.',
            example: false
          }
        }
      },
      ChatCitation: {
        type: 'object',
        properties: {
          titulo: { type: 'string', example: 'Artículo 11: Derecho a la Vida' },
          contenido: { type: 'string', example: 'El derecho a la vida es inviolable. No habrá pena de muerte.' },
          origen: { type: 'string', enum: ['vectorial', 'lexico', 'ambos'], example: 'vectorial' }
        }
      },
      ChatQueryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          agente: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              nombre: { type: 'string', example: 'ConstitucionalBot Colombia' },
              rol: { type: 'string', example: 'Asesor Jurídico Constitucional Senior' },
              modelo: { type: 'string', example: '@cf/meta/llama-4-scout-17b-16e-instruct' }
            }
          },
          modeloUsado: { type: 'string', example: '@cf/meta/llama-4-scout-17b-16e-instruct' },
          pregunta: { type: 'string', example: '¿Qué establece la Constitución colombiana sobre el derecho a la vida?' },
          respuesta: { type: 'string', example: 'Conforme al Artículo 11...' },
          citas: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatCitation' }
          },
          isLiveAI: { type: 'boolean', example: true }
        }
      },
      Skill: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          codigo: { type: 'string', example: 'CONSTITUCIONAL' },
          nombre: { type: 'string', example: 'Derecho Constitucional' },
          descripcion: { type: 'string', example: 'Conocimiento dogmático y orgánico de la Carta Magna de Colombia de 1991' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Mensaje descriptivo del error' },
          error: { type: 'string', example: 'Detalle de la excepción técnica' }
        }
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validación fallida: campos requeridos faltantes o inválidos' },
          errors: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            },
            example: {
              slug: ['El slug solo puede contener letras minúsculas, números y guiones'],
              pregunta: ['La pregunta debe contener al menos 3 caracteres']
            }
          }
        }
      }
    }
  }
};
