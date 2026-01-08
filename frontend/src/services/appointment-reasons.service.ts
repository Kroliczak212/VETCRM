import { apiClient } from '@/lib/api-client';
import type { Pagination } from '@/types/common';

export interface AppointmentReason {
  id: number;
  name: string;
  description?: string;
  is_vaccination: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentReasonData {
  name: string;
  description?: string;
  isVaccination?: boolean;
  displayOrder?: number;
}

export interface UpdateAppointmentReasonData {
  name?: string;
  description?: string;
  isVaccination?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export const appointmentReasonsService = {
  async getAll(params?: {
    isVaccination?: boolean;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{ data: AppointmentReason[]; pagination: Pagination }> {
    const response = await apiClient.get('/appointment-reasons', { params });
    return response.data;
  },

  async getById(id: number): Promise<AppointmentReason> {
    const response = await apiClient.get(`/appointment-reasons/${id}`);
    return response.data.reason;
  },

  async create(data: CreateAppointmentReasonData): Promise<AppointmentReason> {
    const response = await apiClient.post('/appointment-reasons', data);
    return response.data.reason;
  },

  async update(id: number, data: UpdateAppointmentReasonData): Promise<AppointmentReason> {
    const response = await apiClient.put(`/appointment-reasons/${id}`, data);
    return response.data.reason;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/appointment-reasons/${id}`);
  },
};
