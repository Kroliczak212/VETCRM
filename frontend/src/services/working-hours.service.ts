import { apiClient } from '@/lib/api-client';

export interface WorkingHours {
  id: number;
  doctor_user_id: number;
  doctor_name: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingHoursByDay {
  monday: WorkingHours[];
  tuesday: WorkingHours[];
  wednesday: WorkingHours[];
  thursday: WorkingHours[];
  friday: WorkingHours[];
  saturday: WorkingHours[];
  sunday: WorkingHours[];
}

export interface CreateWorkingHoursData {
  doctorUserId: number;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
}

export interface BulkCreateWorkingHoursData {
  doctorUserId: number;
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  startTime: string;
  endTime: string;
}

export interface UpdateWorkingHoursData {
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

class WorkingHoursService {
  async getAll(params?: {
    doctorId?: number;
    dayOfWeek?: string;
    isActive?: boolean;
  }) {
    const { data } = await apiClient.get<{ data: WorkingHours[] }>('/working-hours', { params });
    return data.data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ workingHours: WorkingHours }>(`/working-hours/${id}`);
    return data.workingHours;
  }

  async getByDoctorId(doctorId: number) {
    const { data } = await apiClient.get<{ workingHours: WorkingHoursByDay }>(`/working-hours/doctor/${doctorId}`);
    return data.workingHours;
  }

  async create(workingHoursData: CreateWorkingHoursData) {
    const { data } = await apiClient.post<{ message: string; workingHours: WorkingHours }>('/working-hours', workingHoursData);
    return data;
  }

  async bulkCreate(bulkData: BulkCreateWorkingHoursData) {
    const { data } = await apiClient.post<{ message: string; created: WorkingHours[] }>('/working-hours/bulk', bulkData);
    return data;
  }

  async update(id: number, workingHoursData: UpdateWorkingHoursData) {
    const { data } = await apiClient.put<{ message: string; workingHours: WorkingHours }>(`/working-hours/${id}`, workingHoursData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/working-hours/${id}`);
    return data;
  }

  async hardDelete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/working-hours/${id}/hard`);
    return data;
  }
}

export const workingHoursService = new WorkingHoursService();

export const getWorkingHours = async (params?: {
  doctorId?: number;
  dayOfWeek?: string;
  isActive?: boolean;
}) => {
  return workingHoursService.getAll(params);
};

export const getWorkingHoursById = async (id: number) => {
  return workingHoursService.getById(id);
};

export const getWorkingHoursByDoctorId = async (doctorId: number) => {
  return workingHoursService.getByDoctorId(doctorId);
};

export const createWorkingHours = async (workingHoursData: CreateWorkingHoursData) => {
  return workingHoursService.create(workingHoursData);
};

export const bulkCreateWorkingHours = async (bulkData: BulkCreateWorkingHoursData) => {
  return workingHoursService.bulkCreate(bulkData);
};

export const updateWorkingHours = async (id: number, workingHoursData: UpdateWorkingHoursData) => {
  return workingHoursService.update(id, workingHoursData);
};

export const deleteWorkingHours = async (id: number) => {
  return workingHoursService.delete(id);
};

export const hardDeleteWorkingHours = async (id: number) => {
  return workingHoursService.hardDelete(id);
};
