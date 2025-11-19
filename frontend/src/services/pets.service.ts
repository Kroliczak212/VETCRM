import { apiClient } from '@/lib/api-client';

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

class PetsService {
  async getAll(params?: { page?: number; limit?: number; ownerId?: number; species?: string; search?: string }) {
    const { data } = await apiClient.get<{ data: Pet[]; pagination: any }>('/pets', { params });
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

  async getSpecies() {
    const { data } = await apiClient.get<{ species: Array<{ value: string; label: string }> }>('/pets/species');
    return data.species;
  }
}

export const petsService = new PetsService();

/**
 * Get pets for the currently logged-in user (client)
 * Backend will automatically filter based on JWT token
 */
export const getUserPets = async (): Promise<Pet[]> => {
  const result = await petsService.getAll();
  return result.data;
};
