import { apiClient } from '@/lib/api-client';

export interface VaccinationType {
  id: number;
  name: string;
  species: 'pies' | 'kot' | 'gryzoń' | 'ptak' | 'inne' | 'wszystkie';
  description?: string;
  recommended_interval_months?: number;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVaccinationTypeData {
  name: string;
  species?: 'pies' | 'kot' | 'gryzoń' | 'ptak' | 'inne' | 'wszystkie';
  description?: string;
  recommendedIntervalMonths?: number;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface UpdateVaccinationTypeData {
  name?: string;
  species?: 'pies' | 'kot' | 'gryzoń' | 'ptak' | 'inne' | 'wszystkie';
  description?: string;
  recommendedIntervalMonths?: number;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export const vaccinationTypesService = {
  async getAll(params?: {
    species?: string;
    isRequired?: boolean;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{ data: VaccinationType[]; pagination: any }> {
    const response = await apiClient.get('/vaccination-types', { params });
    return response.data;
  },

  async getById(id: number): Promise<VaccinationType> {
    const response = await apiClient.get(`/vaccination-types/${id}`);
    return response.data.type;
  },

  async create(data: CreateVaccinationTypeData): Promise<VaccinationType> {
    const response = await apiClient.post('/vaccination-types', data);
    return response.data.type;
  },

  async update(id: number, data: UpdateVaccinationTypeData): Promise<VaccinationType> {
    const response = await apiClient.put(`/vaccination-types/${id}`, data);
    return response.data.type;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/vaccination-types/${id}`);
  },
};
