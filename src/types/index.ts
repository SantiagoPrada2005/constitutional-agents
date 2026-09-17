export interface Skill {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface DocumentChunk {
  id: number;
  agenteId: number | null;
  dominio: string;
  habilidadId: number | null;
  vectorId: string | null;
  nombreArchivo: string;
  tituloSeccion: string;
  contenido: string;
  createdAt: string | null;
}

export interface AgentWithSkills {
  id: number;
  slug: string;
  nombre: string;
  rol: string;
  modelo: string;
  temperatura: number;
  systemPrompt: string;
  activo: number;
  createdAt: string | null;
  habilidadesList: Skill[];
  habilidadesCodigos: string[];
  habilidades: string;
  documentosCount: number;
}

export interface DocumentVectorMetadata {
  agente_id?: string;
  dominio?: string;
  titulo?: string;
  archivo?: string;
  contenido?: string;
}

export interface RetrievedChunk {
  titulo: string;
  contenido: string;
  score?: number;
  origen: 'vectorial' | 'lexico';
  vectorId?: string;
}
