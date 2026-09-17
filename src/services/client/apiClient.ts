import type { CreateAgentInputDTO, UpdateAgentInputDTO } from '../../schemas/agent.schema';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  id?: number;
}

export interface IngestResponse extends ApiResponse {
  chunksIngested?: number;
  sections?: number;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl = '/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || `Error HTTP ${res.status}: ${res.statusText}`;
        throw new ApiError(res.status, errorMsg, data);
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(0, err.message || 'Error de comunicación con el servicio de API REST');
    }
  }

  async getAgentes() {
    return this.request<any[]>('/agentes');
  }

  async getAgente(id: number) {
    return this.request<any>(`/agentes/${id}`);
  }

  async createAgente(agent: CreateAgentInputDTO) {
    return this.request<ApiResponse>('/agentes', {
      method: 'POST',
      body: JSON.stringify(agent)
    });
  }

  async updateAgente(id: number, agent: UpdateAgentInputDTO) {
    return this.request<ApiResponse>(`/agentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agent)
    });
  }

  async deleteAgente(id: number) {
    return this.request<ApiResponse>(`/agentes/${id}`, {
      method: 'DELETE'
    });
  }

  async ingestarConocimiento(id: number, nombreArchivo: string, contenido: string, dominio?: string, habilidadId?: number): Promise<IngestResponse> {
    return this.request<IngestResponse>(`/agentes/${id}/conocimiento`, {
      method: 'POST',
      body: JSON.stringify({ nombreArchivo, contenido, dominio, habilidadId })
    });
  }

  async getConocimiento(id: number, options?: { all?: boolean; dominio?: string }) {
    const params = new URLSearchParams();
    if (options?.all) params.set('all', 'true');
    if (options?.dominio) params.set('dominio', options.dominio);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ success: boolean; count: number; data: any[] }>(`/agentes/${id}/conocimiento${query}`);
  }

  async updateConocimiento(id: number, data: { documentoId: number; tituloSeccion?: string; contenido?: string; dominio?: string }) {
    return this.request<ApiResponse>(`/agentes/${id}/conocimiento`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteConocimiento(id: number, documentoId: number) {
    return this.request<ApiResponse>(`/agentes/${id}/conocimiento?documentoId=${documentoId}`, {
      method: 'DELETE'
    });
  }

  async consultarRag(id: number, pregunta: string, onToken?: (token: string) => void) {
    const url = `${this.baseUrl}/agentes/${id}/consultar`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, stream: !!onToken })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
      throw new ApiError(res.status, err.message || 'Error al procesar consulta');
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && res.body && onToken) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace(/^data:\s*/, '').trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed.response || parsed.token || '';
                fullText += token;
                onToken(token);
              } catch {
                fullText += dataStr;
                onToken(dataStr);
              }
            }
          }
        }
      }
      return { respuesta: fullText };
    }

    return res.json();
  }
}

export const apiClient = new ApiClient();
