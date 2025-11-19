import { apiClient } from '@/lib/api-client';

export interface User {
  id: number;
  email: string;
  role_name: 'admin' | 'receptionist' | 'doctor' | 'client';
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password?: string;
  roleName: 'admin' | 'receptionist' | 'doctor';
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
}

class UsersService {
  async getAll(params?: { page?: number; limit?: number; role?: string; search?: string }) {
    const { data } = await apiClient.get<{ data: User[]; pagination: any }>('/users', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ user: User }>(`/users/${id}`);
    return data.user;
  }

  async create(userData: CreateUserData) {
    const { data } = await apiClient.post<{ message: string; user: User }>('/users', userData);
    return data;
  }

  async update(id: number, userData: UpdateUserData) {
    const { data } = await apiClient.put<{ message: string; user: User }>(`/users/${id}`, userData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/users/${id}`);
    return data;
  }

  async updateIsActive(id: number, isActive: boolean) {
    const { data } = await apiClient.patch<{ message: string; user: User }>(`/users/${id}/is-active`, { isActive });
    return data;
  }

  async getDoctors() {
    const { data } = await apiClient.get<{ users: User[] }>('/users/doctors');
    return { data: data.users };
  }
}

export const usersService = new UsersService();
