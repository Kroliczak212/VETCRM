import { apiClient } from '@/lib/api-client';
import type { Pagination } from '@/types/common';

export interface Appointment {
  id: number;
  pet_id: number;
  pet_name: string;
  species: string;
  breed?: string;
  client_name: string;
  client_phone: string;
  doctor_user_id: number;
  doctor_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'proposed' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'cancelled_late';
  time_status: 'past' | 'today' | 'future';
  reason?: string;
  reason_id?: number;
  reason_name?: string;
  reason_is_vaccination?: boolean;
  vaccination_type_id?: number;
  vaccination_type_name?: string;
  location?: string;
  services?: AppointmentService[];
  medical_record?: MedicalRecord;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface MedicalFile {
  id: number;
  medical_record_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface MedicalRecord {
  id: number;
  appointment_id: number;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  files?: MedicalFile[];
  created_at: string;
}

export interface CreateAppointmentData {
  petId: number;
  doctorId: number;
  scheduledAt: string;
  durationMinutes: number;
  reason?: string;
  reasonId?: number;
  vaccinationTypeId?: number;
  location?: string;
  status?: 'proposed' | 'confirmed';
  services?: Array<{
    serviceId: number;
    quantity?: number;
    unitPrice: number;
  }>;
}

export interface UpdateAppointmentData {
  scheduledAt?: string;
  durationMinutes?: number;
  reason?: string;
  reasonId?: number;
  vaccinationTypeId?: number;
  location?: string;
  services?: Array<{
    serviceId: number;
    quantity?: number;
    unitPrice: number;
  }>;
}

export interface CancelAppointmentResponse {
  message: string;
  status: 'cancelled' | 'cancelled_late';
  hasFee: boolean;
  fee: number | null;
  warning: string;
}

export interface RescheduleRequest {
  id: number;
  appointment_id: number;
  old_scheduled_at: string;
  new_scheduled_at: string;
  requested_by: number;
  requested_at: string;
  client_note?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number;
  reviewed_at?: string;
  rejection_reason?: string;
  appointment_reason?: string;
  client_name?: string;
  client_phone?: string;
  doctor_name?: string;
  pet_name?: string;
  species?: string;
  reviewer_name?: string;
}

export interface RescheduleRequestResponse {
  message: string;
  requestId: number;
  oldTime: string;
  newTime: string;
  status: 'pending';
}

export interface TimeRange {
  startTime: string | null;
  endTime: string | null;
  hasDoctors: boolean;
}

export interface DoctorTimeRange {
  startTime: string | null;
  endTime: string | null;
  isWorking: boolean;
}

export interface DoctorSlotInfo {
  doctorId: number;
  doctorName: string;
  isAvailable: boolean;
}

class AppointmentsService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    doctorId?: number;
    petId?: number;
    status?: string;
    date?: string;
  }) {
    const { data } = await apiClient.get<{ data: Appointment[]; pagination: Pagination }>('/appointments', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ appointment: Appointment }>(`/appointments/${id}`);
    return data.appointment;
  }

  async create(appointmentData: CreateAppointmentData) {
    const { data } = await apiClient.post<{ message: string; appointment: Appointment }>('/appointments', appointmentData);
    return data;
  }

  async update(id: number, appointmentData: UpdateAppointmentData) {
    const { data } = await apiClient.put<{ message: string; appointment: Appointment }>(`/appointments/${id}`, appointmentData);
    return data;
  }

  async updateStatus(id: number, status: Appointment['status'], vaccinationPerformed?: boolean) {
    const { data } = await apiClient.patch<{
      message: string;
      appointment: Appointment & {
        vaccinationCreated?: boolean;
        vaccinationId?: number;
        vaccinationError?: string;
        medicalRecordCreated?: boolean;
        medicalRecordId?: number;
      }
    }>(`/appointments/${id}/status`, {
      status,
      vaccinationPerformed
    });
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/appointments/${id}`);
    return data;
  }

  async checkAvailability(params: { doctorId: number; scheduledAt: string; durationMinutes: number }) {
    const { data } = await apiClient.get<{ isAvailable: boolean }>('/appointments/check-availability', { params });
    return data.isAvailable;
  }

  async getAvailableSlots(params: { doctorId: number; date: string }) {
    const { data } = await apiClient.get<{ slots: Array<{ time: string; available: boolean }> }>('/appointments/available-slots', { params });
    return data.slots;
  }

  async cancelAppointment(id: number) {
    const { data } = await apiClient.post<CancelAppointmentResponse>(`/appointments/${id}/cancel`);
    return data;
  }

  async requestReschedule(id: number, newScheduledAt: string, clientNote?: string) {
    const { data } = await apiClient.post<RescheduleRequestResponse>(`/appointments/${id}/reschedule-request`, {
      newScheduledAt,
      clientNote,
    });
    return data;
  }

  async getRescheduleRequests(status?: 'pending' | 'approved' | 'rejected') {
    const { data } = await apiClient.get<{ requests: RescheduleRequest[] }>('/appointments/reschedule-requests', {
      params: status ? { status } : undefined,
    });
    return data.requests;
  }

  async approveReschedule(requestId: number) {
    const { data } = await apiClient.post<{ message: string; appointmentId: number; newTime: string }>(
      `/appointments/reschedule-requests/${requestId}/approve`
    );
    return data;
  }

  async rejectReschedule(requestId: number, rejectionReason?: string) {
    const { data } = await apiClient.post<{ message: string; appointmentId: number; reason?: string }>(
      `/appointments/reschedule-requests/${requestId}/reject`,
      { rejectionReason }
    );
    return data;
  }

  async getTimeRangeForAllDoctors(date: string) {
    const { data } = await apiClient.get<{ timeRange: TimeRange }>(
      '/appointments/time-range-all-doctors',
      { params: { date } }
    );
    return data.timeRange;
  }

  async getDoctorsForSlot(date: string, time: string) {
    const { data } = await apiClient.get<{ doctors: DoctorSlotInfo[] }>(
      '/appointments/doctors-for-slot',
      { params: { date, time } }
    );
    return data.doctors;
  }

  async getDoctorTimeRange(doctorId: number, date: string) {
    const { data } = await apiClient.get<{ timeRange: DoctorTimeRange }>(
      '/appointments/doctor-time-range',
      { params: { doctorId, date } }
    );
    return data.timeRange;
  }

  /**
   * Force reschedule appointment by staff (receptionist/admin)
   * Directly changes the appointment time and notifies the client via email
   */
  async forceReschedule(id: number, newScheduledAt: string, reason?: string, newDoctorId?: number) {
    const { data } = await apiClient.post<{
      message: string;
      appointmentId: number;
      oldTime: string;
      newTime: string;
      doctorChanged: boolean;
      newDoctorId: number | null;
      newDoctorName: string | null;
      clientNotified: boolean;
    }>(`/appointments/${id}/force-reschedule`, {
      newScheduledAt,
      reason,
      newDoctorId,
    });
    return data;
  }
}

export const appointmentsService = new AppointmentsService();

export const getAppointments = async (params?: {
  page?: number;
  limit?: number;
  doctorId?: number;
  petId?: number;
  clientId?: number;
  status?: string;
  date?: string;
}) => {
  return appointmentsService.getAll(params);
};

export const getAppointmentById = async (id: number) => {
  return appointmentsService.getById(id);
};

export const createAppointment = async (appointmentData: CreateAppointmentData) => {
  return appointmentsService.create(appointmentData);
};

export const updateAppointment = async (id: number, appointmentData: UpdateAppointmentData) => {
  return appointmentsService.update(id, appointmentData);
};

export const updateAppointmentStatus = async (id: number, status: Appointment['status']) => {
  return appointmentsService.updateStatus(id, status);
};

export const deleteAppointment = async (id: number) => {
  return appointmentsService.delete(id);
};

export const checkAppointmentAvailability = async (params: { doctorId: number; scheduledAt: string; durationMinutes: number }) => {
  return appointmentsService.checkAvailability(params);
};

export const getAvailableSlots = async (params: { doctorId: number; date: string }) => {
  return appointmentsService.getAvailableSlots(params);
};
