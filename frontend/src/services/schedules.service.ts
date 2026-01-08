import { apiClient } from '@/lib/api-client';

export interface Schedule {
  id: number;
  doctor_user_id: number;
  doctor_name: string;
  date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  repeat_pattern?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_user_id?: number;
  approved_by_user_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleData {
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  repeatPattern?: string;
  notes?: string;
}

export interface UpdateScheduleData {
  date?: string;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
  repeatPattern?: string;
  notes?: string;
}

export interface ApproveScheduleData {
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface CalendarDay {
  date: string;
  day_name: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  source: 'schedule' | 'working_hours' | 'none';
  notes: string | null;
}

class SchedulesService {
  async getAll(params?: { doctorId?: number; date?: string; startDate?: string; endDate?: string; status?: string }) {
    const { data } = await apiClient.get<{ schedules: Schedule[] }>('/schedules', { params });
    return { data: data.schedules };
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ schedule: Schedule }>(`/schedules/${id}`);
    return data.schedule;
  }

  async create(scheduleData: CreateScheduleData) {
    const { data } = await apiClient.post<{ message: string; schedule: Schedule }>('/schedules', scheduleData);
    return data;
  }

  async update(id: number, scheduleData: UpdateScheduleData) {
    const { data } = await apiClient.put<{ message: string; schedule: Schedule }>(`/schedules/${id}`, scheduleData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/schedules/${id}`);
    return data;
  }

  async approve(id: number, approvalData: ApproveScheduleData) {
    const { data } = await apiClient.patch<{ message: string; schedule: Schedule }>(`/schedules/${id}/approve`, approvalData);
    return data;
  }

  async getCalendar(params: { doctorId?: number; startDate: string; endDate: string }) {
    const { data } = await apiClient.get<{ calendar: CalendarDay[] }>('/schedules/calendar', { params });
    return { data: data.calendar };
  }
}

export const schedulesService = new SchedulesService();

export const getSchedules = async (params?: { doctorId?: number; date?: string; startDate?: string; endDate?: string; status?: string }) => {
  return schedulesService.getAll(params);
};

export const getScheduleById = async (id: number) => {
  return schedulesService.getById(id);
};

export const createSchedule = async (scheduleData: CreateScheduleData) => {
  return schedulesService.create(scheduleData);
};

export const updateSchedule = async (id: number, scheduleData: UpdateScheduleData) => {
  return schedulesService.update(id, scheduleData);
};

export const deleteSchedule = async (id: number) => {
  return schedulesService.delete(id);
};

export const approveSchedule = async (id: number, approvalData: ApproveScheduleData) => {
  return schedulesService.approve(id, approvalData);
};
