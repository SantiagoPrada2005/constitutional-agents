import { AgentRepository, type CreateAgentInput } from '../repositories/agent.repository';
import type { CreateAgentDTO, UpdateAgentDTO } from '../schemas/agent.schema';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AgentService {
  constructor(private readonly agentRepo: AgentRepository) {}

  async getAllAgents() {
    return this.agentRepo.findAll();
  }

  async getAgentById(id: number) {
    const agent = await this.agentRepo.findById(id);
    if (!agent) {
      throw new NotFoundError(`Agente con ID ${id} no fue encontrado`);
    }
    return agent;
  }

  async createAgent(dto: CreateAgentDTO) {
    const existing = await this.agentRepo.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictError(`El identificador (slug) "${dto.slug}" ya está registrado`);
    }

    const { habilidades, ...agentData } = dto;
    const input: CreateAgentInput = {
      slug: agentData.slug,
      nombre: agentData.nombre,
      rol: agentData.rol,
      modelo: agentData.modelo,
      temperatura: agentData.temperatura,
      systemPrompt: agentData.systemPrompt,
      activo: agentData.activo
    };
    return this.agentRepo.create(input, habilidades || []);
  }

  async updateAgent(id: number, dto: UpdateAgentDTO) {
    const current = await this.agentRepo.findById(id);
    if (!current) {
      throw new NotFoundError(`Agente con ID ${id} no existe`);
    }

    if (dto.slug && dto.slug !== current.slug) {
      const existing = await this.agentRepo.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictError(`El identificador (slug) "${dto.slug}" ya está en uso por otro agente`);
      }
    }

    const { habilidades, ...agentData } = dto;
    return this.agentRepo.update(id, agentData, habilidades);
  }

  async deleteAgent(id: number) {
    const current = await this.agentRepo.findById(id);
    if (!current) {
      throw new NotFoundError(`Agente con ID ${id} no existe`);
    }
    return this.agentRepo.delete(id);
  }

  async getAvailableSkills() {
    return this.agentRepo.findAllSkills();
  }
}
