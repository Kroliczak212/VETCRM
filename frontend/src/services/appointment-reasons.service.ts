import { apiClient } from '@/lib/api-client';

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
  /**
   * Get all appointment reasons with optional filters
   */
  async getAll(params?: {
    isVaccination?: boolean;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{ data: AppointmentReason[]; pagination: any }> {
    const response = await apiClient.get('/appointment-reasons', { params });
    return response.data;
  },

  /**
   * Get appointment reason by ID
   */
  async getById(id: number): Promise<AppointmentReason> {
    const response = await apiClient.get(`/appointment-reasons/${id}`);
    return response.data.reason;
  },

  /**
   * Create new appointment reason (admin only)
   */
  async create(data: CreateAppointmentReasonData): Promise<AppointmentReason> {
    const response = await apiClient.post('/appointment-reasons', data);
    return response.data.reason;
  },

  /**
   * Update appointment reason (admin only)
   */
  async update(id: number, data: UpdateAppointmentReasonData): Promise<AppointmentReason> {
    const response = await apiClient.put(`/appointment-reasons/${id}`, data);
    return response.data.reason;
  },

  /**
   * Delete (deactivate) appointment reason (admin only)
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/appointment-reasons/${id}`);
  },
};
