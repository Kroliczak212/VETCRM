import { apiClient } from '@/lib/api-client';

export interface Payment {
  id: number;
  appointment_id: number;
  amount_due: number;
  amount_paid: number;
  status: 'unpaid' | 'partially_paid' | 'paid';
  payment_method: 'cash' | 'card' | 'online';
  payment_date: string | null;
  created_at: string;
  // Extended fields from JOIN
  scheduled_at?: string;
  appointment_status?: string;
  client_first_name?: string;
  client_last_name?: string;
}

export interface PaymentCreate {
  appointmentId: number;
  amountDue: number;
  paymentMethod?: 'cash' | 'card' | 'online';
}

export interface PaymentUpdate {
  amountPaid?: number;
  paymentMethod?: 'cash' | 'card' | 'online';
  paymentDate?: string;
}

export interface PaymentStatistics {
  total_paid: number;
  total_unpaid: number;
  total_partial: number;
  count_paid: number;
  count_unpaid: number;
  count_partial: number;
}

export interface PaymentsResponse {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get all payments with pagination and filters
 */
export const getPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: 'unpaid' | 'partially_paid' | 'paid';
  appointmentId?: number;
}): Promise<PaymentsResponse> => {
  const response = await apiClient.get<PaymentsResponse>('/payments', { params });
  return response.data;
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (id: number): Promise<Payment> => {
  const response = await apiClient.get<Payment>(`/payments/${id}`);
  return response.data;
};

/**
 * Get payment by appointment ID
 */
export const getPaymentByAppointmentId = async (appointmentId: number): Promise<Payment> => {
  const response = await apiClient.get<Payment>(`/payments/appointment/${appointmentId}`);
  return response.data;
};

/**
 * Create new payment
 */
export const createPayment = async (data: PaymentCreate): Promise<Payment> => {
  const response = await apiClient.post<Payment>('/payments', data);
  return response.data;
};

/**
 * Update payment (record payment)
 */
export const updatePayment = async (id: number, data: PaymentUpdate): Promise<Payment> => {
  const response = await apiClient.patch<Payment>(`/payments/${id}`, data);
  return response.data;
};

/**
 * Delete payment
 */
export const deletePayment = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/payments/${id}`);
  return response.data;
};

/**
 * Get payment statistics
 */
export const getPaymentStatistics = async (): Promise<PaymentStatistics> => {
  const response = await apiClient.get<PaymentStatistics>('/payments/statistics');
  return response.data;
};

/**
 * Helper: Calculate remaining balance
 */
export const calculateBalance = (payment: Payment): number => {
  return payment.amount_due - payment.amount_paid;
};

/**
 * Helper: Format payment status for display
 */
export const formatPaymentStatus = (status: Payment['status']): string => {
  const statusMap = {
    unpaid: 'Nieopłacone',
    partially_paid: 'Częściowo opłacone',
    paid: 'Opłacone',
  };
  return statusMap[status];
};

/**
 * Helper: Get status color class
 */
export const getPaymentStatusColor = (status: Payment['status']): string => {
  const colorMap = {
    unpaid: 'text-red-600 bg-red-50',
    partially_paid: 'text-yellow-600 bg-yellow-50',
    paid: 'text-green-600 bg-green-50',
  };
  return colorMap[status];
};
