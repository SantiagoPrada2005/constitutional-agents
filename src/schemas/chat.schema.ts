import { z } from 'zod';

export const ChatQuerySchema = z.object({
  pregunta: z.string().min(3, 'La pregunta debe contener al menos 3 caracteres'),
  stream: z.boolean().optional().default(true)
});

export const IngestDocumentSchema = z.object({
  nombreArchivo: z.string().min(1, 'El nombre del archivo es obligatorio'),
  contenido: z.string().min(10, 'El contenido del documento debe tener al menos 10 caracteres'),
  dominio: z.string().optional().default('transversal'),
  habilidadId: z.number().optional()
});

export const UpdateDocumentChunkSchema = z.object({
  documentoId: z.number().int().positive('ID de documento requerido').optional(),
  id: z.number().int().positive().optional(),
  tituloSeccion: z.string().min(1, 'El título de la sección no puede estar vacío').optional(),
  contenido: z.string().min(5, 'El contenido debe tener al menos 5 caracteres').optional(),
  dominio: z.string().optional()
}).refine((data) => data.documentoId !== undefined || data.id !== undefined, {
  message: 'documentoId o id es obligatorio'
});

export type ChatQueryDTO = z.infer<typeof ChatQuerySchema>;
export type IngestDocumentDTO = z.infer<typeof IngestDocumentSchema>;
export type UpdateDocumentChunkDTO = z.infer<typeof UpdateDocumentChunkSchema>;
