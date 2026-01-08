import { apiClient } from '@/lib/api-client';

export interface AdminStatistics {
  totalStaff: number;
  activeDoctors: number;
  totalAppointments: number;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  recentActivity: Array<{
    id: number;
    status: string;
    scheduled_at: string;
    created_at: string;
    client_name: string;
    pet_name: string;
    doctor_name: string;
  }>;
}

export interface ReceptionistStatistics {
  todayAppointments: number;
  pendingAppointments: number;
  newClientsThisMonth: number;
  appointmentsList: Array<{
    id: number;
    scheduled_at: string;
    status: string;
    duration_minutes: number;
    reason: string | null;
    pet_name: string;
    species: string;
    client_name: string;
    client_phone: string;
    doctor_name: string;
  }>;
}

export interface DoctorStatistics {
  todayAppointments: number;
  completedToday: number;
  upcomingToday: number;
  totalPatients: number;
  weekTotalAppointments: number;
  weekCompletedAppointments: number;
  appointmentsList: Array<{
    id: number;
    scheduled_at: string;
    status: string;
    duration_minutes: number;
    reason: string | null;
    location: string | null;
    pet_id: number;
    pet_name: string;
    species: string;
    breed: string | null;
    client_name: string;
    client_phone: string;
    client_email: string;
  }>;
}

export interface ClientStatistics {
  totalPets: number;
  upcomingAppointments: number;
  totalAppointments: number;
}

export const getAdminStatistics = async (): Promise<AdminStatistics> => {
  const response = await apiClient.get<AdminStatistics>('/dashboard/admin');
  return response.data;
};

export const getReceptionistStatistics = async (): Promise<ReceptionistStatistics> => {
  const response = await apiClient.get<ReceptionistStatistics>('/dashboard/receptionist');
  return response.data;
};

export const getDoctorStatistics = async (): Promise<DoctorStatistics> => {
  const response = await apiClient.get<DoctorStatistics>('/dashboard/doctor');
  return response.data;
};

export const getClientStatistics = async (): Promise<ClientStatistics> => {
  const response = await apiClient.get<ClientStatistics>('/dashboard/client');
  return response.data;
};

export const formatAppointmentStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    proposed: 'Zaproponowana',
    confirmed: 'Potwierdzona',
    in_progress: 'W trakcie',
    completed: 'Zakończona',
    cancelled: 'Odwołana',
    cancelled_late: 'Odwołana (późno)',
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    proposed: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    cancelled_late: 'bg-red-200 text-red-900',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};
