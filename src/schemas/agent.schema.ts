import { z } from 'zod';

export const InsertAgentSchema = z.object({
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres').max(60).regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  rol: z.string().min(2, 'El rol debe tener al menos 2 caracteres').max(100),
  modelo: z.string().default('@cf/meta/llama-4-scout-17b-16e-instruct'),
  temperatura: z.number().min(0).max(1).default(0.2),
  systemPrompt: z.string().min(10, 'El prompt del sistema debe tener al menos 10 caracteres'),
  activo: z.number().optional().default(1),
  habilidades: z.array(z.string()).default([])
});

export const UpdateAgentSchema = z.object({
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/).optional(),
  nombre: z.string().min(2).max(100).optional(),
  rol: z.string().min(2).max(100).optional(),
  modelo: z.string().optional(),
  temperatura: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().min(10).optional(),
  activo: z.number().optional(),
  habilidades: z.array(z.string()).optional()
});

export type CreateAgentDTO = z.infer<typeof InsertAgentSchema>;
export type CreateAgentInputDTO = z.input<typeof InsertAgentSchema>;
export type UpdateAgentDTO = z.infer<typeof UpdateAgentSchema>;
export type UpdateAgentInputDTO = z.input<typeof UpdateAgentSchema>;
