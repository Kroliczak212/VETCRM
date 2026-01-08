import { apiClient } from '@/lib/api-client';
import type { Pagination } from '@/types/common';

export interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateServiceData {
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
}

export interface UpdateServiceData {
  name?: string;
  category?: string;
  price?: number;
  durationMinutes?: number;
  description?: string;
}

class ServicesService {
  async getAll(params?: { page?: number; limit?: number; category?: string; search?: string }) {
    const { data } = await apiClient.get<{ data: Service[]; pagination: Pagination }>('/services', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ service: Service }>(`/services/${id}`);
    return data.service;
  }

  async create(serviceData: CreateServiceData) {
    const { data } = await apiClient.post<{ message: string; service: Service }>('/services', serviceData);
    return data;
  }

  async update(id: number, serviceData: UpdateServiceData) {
    const { data } = await apiClient.put<{ message: string; service: Service }>(`/services/${id}`, serviceData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/services/${id}`);
    return data;
  }

  async getCategories() {
    const { data } = await apiClient.get<{ categories: string[] }>('/services/categories');
    return data.categories;
  }
}

export const servicesService = new ServicesService();
