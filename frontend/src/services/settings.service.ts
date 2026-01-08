import { apiClient } from '@/lib/api-client';

export interface Setting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  updatedAt: string;
}

export interface SettingUpdate {
  value: any;
}

export interface SettingCreate {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
}

export interface SettingsObject {
  [key: string]: {
    value: any;
    type: string;
    description: string;
    updatedAt: string;
  };
}

export interface WorkingHours {
  monday: { open: string | null; close: string | null };
  tuesday: { open: string | null; close: string | null };
  wednesday: { open: string | null; close: string | null };
  thursday: { open: string | null; close: string | null };
  friday: { open: string | null; close: string | null };
  saturday: { open: string | null; close: string | null };
  sunday: { open: string | null; close: string | null };
}

export const getSettings = async (): Promise<SettingsObject> => {
  const response = await apiClient.get<SettingsObject>('/settings');
  return response.data;
};

export const getSettingByKey = async (key: string): Promise<Setting> => {
  const response = await apiClient.get<Setting>(`/settings/${key}`);
  return response.data;
};

export const updateSetting = async (key: string, value: any): Promise<Setting> => {
  const response = await apiClient.patch<Setting>(`/settings/${key}`, { value });
  return response.data;
};

export const updateSettings = async (
  settings: Record<string, any>
): Promise<{ message: string; updatedKeys: string[] }> => {
  const response = await apiClient.patch<{ message: string; updatedKeys: string[] }>('/settings', settings);
  return response.data;
};

export const createSetting = async (data: SettingCreate): Promise<Setting> => {
  const response = await apiClient.post<Setting>('/settings', data);
  return response.data;
};

export const deleteSetting = async (key: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/settings/${key}`);
  return response.data;
};

export const initializeDefaultSettings = async (): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/settings/initialize-defaults');
  return response.data;
};

export const getWorkingHoursForDay = (
  workingHours: WorkingHours,
  day: keyof WorkingHours
): { open: string | null; close: string | null } => {
  return workingHours[day];
};

export const isClinicOpenOnDay = (workingHours: WorkingHours, day: keyof WorkingHours): boolean => {
  const hours = workingHours[day];
  return hours.open !== null && hours.close !== null;
};

export const formatWorkingHours = (workingHours: WorkingHours): string => {
  const dayNames: Record<keyof WorkingHours, string> = {
    monday: 'Poniedziałek',
    tuesday: 'Wtorek',
    wednesday: 'Środa',
    thursday: 'Czwartek',
    friday: 'Piątek',
    saturday: 'Sobota',
    sunday: 'Niedziela',
  };

  return Object.entries(workingHours)
    .map(([day, hours]) => {
      const dayName = dayNames[day as keyof WorkingHours];
      if (hours.open && hours.close) {
        return `${dayName}: ${hours.open} - ${hours.close}`;
      }
      return `${dayName}: Zamknięte`;
    })
    .join('\n');
};

export const getTypedSettingValue = <T = any>(settings: SettingsObject, key: string): T | null => {
  const setting = settings[key];
  if (!setting) return null;
  return setting.value as T;
};

export const SETTING_KEYS = {
  CLINIC_NAME: 'clinic_name',
  CLINIC_ADDRESS: 'clinic_address',
  CLINIC_PHONE: 'clinic_phone',
  CLINIC_EMAIL: 'clinic_email',
  WORKING_HOURS: 'working_hours',
  DEFAULT_APPOINTMENT_DURATION: 'default_appointment_duration',
  CANCELLATION_POLICY_HOURS: 'cancellation_policy_hours',
  LATE_CANCELLATION_FEE: 'late_cancellation_fee',
  EMAIL_NOTIFICATIONS_ENABLED: 'email_notifications_enabled',
  SMS_NOTIFICATIONS_ENABLED: 'sms_notifications_enabled',
  APPOINTMENT_REMINDER_HOURS: 'appointment_reminder_hours',
} as const;
