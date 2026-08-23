/** The response envelope every endpoint returns. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  error?: { code: string; details?: Record<string, unknown> };
  errors?: ApiFieldError[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * A normalized API failure. Every request rejects with this shape so callers
 * never have to inspect an Axios error directly.
 */
export class ApiError extends Error {
  readonly status: number;

  readonly code: string;

  readonly fieldErrors: ApiFieldError[];

  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors: ApiFieldError[] = [],
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }

  /** True when the failure is a field level validation problem. */
  get isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR' || this.fieldErrors.length > 0;
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
