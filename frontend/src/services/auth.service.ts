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
  requiresPasswordChange: boolean;
  message: string;
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);

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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return data;
  }

  async verifyResetToken(token: string): Promise<VerifyTokenResponse> {
    const { data } = await apiClient.get<VerifyTokenResponse>(`/auth/verify-reset-token/${token}`);
    return data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword
    });
    return data;
  }

  async updateProfile(profileData: UpdateProfileData): Promise<{ message: string; user: User }> {
    const { data } = await apiClient.put<{ message: string; user: User }>('/auth/profile', profileData);

    // Update local storage with new user data
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }
}

export const authService = new AuthService();
