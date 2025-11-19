import { apiClient } from '@/lib/api-client';

export interface Vaccination {
  id: number;
  pet_id: number;
  pet_name?: string;
  species?: string;
  owner_name?: string;
  vaccine_name: string;
  vaccination_date: string;
  next_due_date: string;
  batch_number?: string;
  administered_by_user_id?: number;
  administered_by_name?: string;
  appointment_id?: number;
  notes?: string;
  status?: 'current' | 'due_soon' | 'overdue'; // Computed by backend
  created_at: string;
  updated_at: string;

  // New vaccination system fields
  source?: 'manual' | 'appointment';
  added_by_user_id?: number;
  added_by_name?: string;
  added_by_role?: string;
  vaccination_type_id?: number;
  vaccination_type_name?: string;
  recommended_interval_months?: number;
}

export interface CreateVaccinationData {
  petId: number;
  vaccineName: string;
  vaccinationDate: string;
  nextDueDate?: string; // Optional, backend will calculate (+1 year) if not provided
  batchNumber?: string;
  appointmentId?: number;
  notes?: string;
}

export interface UpdateVaccinationData {
  vaccineName?: string;
  vaccinationDate?: string;
  nextDueDate?: string;
  batchNumber?: string;
  notes?: string;
}

export interface GetVaccinationsParams {
  page?: number;
  limit?: number;
  petId?: number;
  status?: 'current' | 'due_soon' | 'overdue';
}

class VaccinationsService {
  /**
   * Get all vaccinations (auto-filtered for clients)
   */
  async getAll(params?: GetVaccinationsParams) {
    const { data } = await apiClient.get<{ data: Vaccination[]; pagination: any }>('/vaccinations', { params });
    return data;
  }

  /**
   * Get vaccination by ID
   */
  async getById(id: number) {
    const { data } = await apiClient.get<{ vaccination: Vaccination }>(`/vaccinations/${id}`);
    return data.vaccination;
  }

  /**
   * Get upcoming vaccinations for a specific pet
   * Used for calendar view
   */
  async getUpcomingByPet(petId: number, daysAhead: number = 90) {
    const { data } = await apiClient.get<{ vaccinations: Vaccination[] }>(`/vaccinations/pet/${petId}/upcoming`, {
      params: { daysAhead }
    });
    return data.vaccinations;
  }

  /**
   * Create new vaccination record
   * Only accessible to staff/doctors
   */
  async create(vaccinationData: CreateVaccinationData) {
    const { data } = await apiClient.post<{ message: string; vaccination: Vaccination }>('/vaccinations', vaccinationData);
    return data;
  }

  /**
   * Update vaccination record
   * Only accessible to staff/doctors
   */
  async update(id: number, vaccinationData: UpdateVaccinationData) {
    const { data } = await apiClient.put<{ message: string; vaccination: Vaccination }>(`/vaccinations/${id}`, vaccinationData);
    return data;
  }

  /**
   * Delete vaccination record
   * Only accessible to staff/doctors
   */
  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/vaccinations/${id}`);
    return data;
  }
}

export const vaccinationsService = new VaccinationsService();
