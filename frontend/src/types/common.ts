export interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
      details?: string;
    };
    status?: number;
  };
  message?: string;
}

export function getApiErrorMessage(error: ApiError): string {
  return (
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    'Wystąpił nieoczekiwany błąd'
  );
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface FormError {
  field: string;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type EntityId = number | string;

export type ISODateString = string;

export type CommonStatus = 'active' | 'inactive' | 'pending' | 'deleted';

export type SortDirection = 'asc' | 'desc';

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}
