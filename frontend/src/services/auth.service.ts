import { apiClient, setAuthToken, clearAuthToken } from '@/lib/api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_id: number;
  role_name: 'admin' | 'receptionist' | 'doctor' | 'client';
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);

    // Store token and user
    setAuthToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  async getProfile(): Promise<{ user: User }> {
    const { data } = await apiClient.get<{ user: User }>('/auth/profile');
    return data;
  }

  logout(): void {
    clearAuthToken();
    window.location.href = '/login';
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const user = this.getCurrentUser();
    return !!token && !!user;
  }
}

export const authService = new AuthService();
