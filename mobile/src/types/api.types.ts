/**
 * API Type Contracts
 * Mirrors common-lib ApiResponse wrapper and standard error shapes.
 */

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data: T;
  success?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
