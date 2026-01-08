import { apiClient } from '@/lib/api-client';
import type { Pagination } from '@/types/common';

export interface Pet {
  id: number;
  owner_user_id: number;
  name: string;
  species: string;
  breed?: string;
  sex: 'male' | 'female' | 'unknown';
  date_of_birth?: string;
  notes?: string;
  weight?: number;
  microchip_number?: string;
  owner_name?: string;
  owner_phone?: string;
  medical_history?: MedicalRecord[];
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  appointment_id: number;
  scheduled_at: string;
  status: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  doctor_name: string;
  files?: MedicalFile[];
}

export interface MedicalFile {
  id: number;
  medical_record_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_at: string;
}

export interface CreatePetData {
  ownerId: number;
  name: string;
  species: string;
  breed?: string;
  sex?: 'male' | 'female' | 'unknown';
  dateOfBirth?: string;
  notes?: string;
  weight?: number;
  microchipNumber?: string;
}

export interface UpdatePetData {
  name?: string;
  species?: string;
  breed?: string;
  sex?: 'male' | 'female' | 'unknown';
  dateOfBirth?: string;
  notes?: string;
  weight?: number;
  microchipNumber?: string;
}

// Client self-service - doesn't require ownerId (taken from auth)
export interface CreatePetByClientData {
  name: string;
  species: string;
  breed?: string;
  sex?: 'male' | 'female' | 'unknown';
  dateOfBirth?: string;
  notes?: string;
  weight?: number;
  microchipNumber?: string;
}

class PetsService {
  async getAll(params?: { page?: number; limit?: number; ownerId?: number; species?: string; search?: string }) {
    const { data } = await apiClient.get<{ data: Pet[]; pagination: Pagination }>('/pets', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ pet: Pet }>(`/pets/${id}`);
    return data.pet;
  }

  async create(petData: CreatePetData) {
    const { data } = await apiClient.post<{ message: string; pet: Pet }>('/pets', petData);
    return data;
  }

  async update(id: number, petData: UpdatePetData) {
    const { data } = await apiClient.put<{ message: string; pet: Pet }>(`/pets/${id}`, petData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/pets/${id}`);
    return data;
  }

  async generateDocumentation(
    petId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    const params: { startDate?: string; endDate?: string } = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await apiClient.get(`/pets/${petId}/documentation/pdf`, {
      params,
      responseType: 'blob'
    });
    return data;
  }

  // Client self-service methods
  async createByClient(petData: CreatePetByClientData) {
    const { data } = await apiClient.post<{ message: string; pet: Pet }>('/pets/my', petData);
    return data;
  }

  async updateByClient(id: number, petData: UpdatePetData) {
    const { data } = await apiClient.put<{ message: string; pet: Pet }>(`/pets/my/${id}`, petData);
    return data;
  }
}

export const petsService = new PetsService();

export const getUserPets = async (): Promise<Pet[]> => {
  const result = await petsService.getAll();
  return result.data;
};
