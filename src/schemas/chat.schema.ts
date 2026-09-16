import { z } from 'zod';

export const ChatQuerySchema = z.object({
  pregunta: z.string().min(3, 'La pregunta debe contener al menos 3 caracteres'),
  stream: z.boolean().optional().default(true)
});

export const IngestDocumentSchema = z.object({
  nombreArchivo: z.string().min(1, 'El nombre del archivo es obligatorio'),
  contenido: z.string().min(10, 'El contenido del documento debe tener al menos 10 caracteres')
});

export type ChatQueryDTO = z.infer<typeof ChatQuerySchema>;
export type IngestDocumentDTO = z.infer<typeof IngestDocumentSchema>;
