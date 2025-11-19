import { apiClient } from '@/lib/api-client';

export interface Client {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address?: string;
  notes?: string;
  pets_count?: number;
  pets?: Pet[];
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  sex: 'male' | 'female' | 'unknown';
  date_of_birth?: string;
  notes?: string;
  created_at: string;
}

export interface CreateClientData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  notes?: string;
  password?: string;
}

class ClientsService {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const { data } = await apiClient.get<{ data: Client[]; pagination: any }>('/clients', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ client: Client }>(`/clients/${id}`);
    return data.client;
  }

  async create(clientData: CreateClientData) {
    const { data } = await apiClient.post<{ message: string; client: Client }>('/clients', clientData);
    return data;
  }

  async update(id: number, clientData: UpdateClientData) {
    const { data } = await apiClient.put<{ message: string; client: Client }>(`/clients/${id}`, clientData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/clients/${id}`);
    return data;
  }

  async getPets(clientId: number) {
    const { data } = await apiClient.get<{ pets: Pet[] }>(`/clients/${clientId}/pets`);
    return data.pets;
  }
}

export const clientsService = new ClientsService();
