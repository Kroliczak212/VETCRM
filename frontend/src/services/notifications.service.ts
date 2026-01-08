import { apiClient } from '@/lib/api-client';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'appointment' | 'payment' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface NotificationCreate {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'appointment' | 'payment' | 'system';
}

export interface NotificationsResponse {
  data: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export interface UnreadCountResponse {
  count: number;
}

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}): Promise<NotificationsResponse> => {
  const response = await apiClient.get<NotificationsResponse>('/notifications', { params });
  return response.data;
};

export const getNotificationById = async (id: number): Promise<Notification> => {
  const response = await apiClient.get<Notification>(`/notifications/${id}`);
  return response.data;
};

export const createNotification = async (data: NotificationCreate): Promise<Notification> => {
  const response = await apiClient.post<Notification>('/notifications', data);
  return response.data;
};

export const markNotificationAsRead = async (id: number): Promise<Notification> => {
  const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async (): Promise<{ message: string; updatedCount: number }> => {
  const response = await apiClient.patch<{ message: string; updatedCount: number }>('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/notifications/${id}`);
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data.count;
};

export const formatNotificationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    info: 'Informacja',
    warning: 'Ostrzeżenie',
    success: 'Sukces',
    error: 'Błąd',
    appointment: 'Wizyta',
    payment: 'Płatność',
    system: 'System',
  };
  return typeMap[type] || type;
};

export const getNotificationTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    appointment: 'bg-purple-100 text-purple-800',
    payment: 'bg-orange-100 text-orange-800',
    system: 'bg-gray-100 text-gray-800',
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800';
};

export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Teraz';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;

  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
