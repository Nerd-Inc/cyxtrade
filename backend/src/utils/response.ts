import { Response } from 'express';
import { ErrorCode, AppError } from './errors';

// Success response structure
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// Error response structure
interface ErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: Record<string, unknown>;
    isRetryable?: boolean;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Create a success response object
export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

// Create an error response object
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  isRetryable: boolean = false
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      isRetryable,
    },
  };
}

// Create error response from AppError
export function appErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      isRetryable: error.isRetryable,
    },
  };
}

// Send success response
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json(successResponse(data));
}

// Send error response
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): void {
  const isRetryable = [
    ErrorCode.DATABASE_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.RATE_LIMITED,
    ErrorCode.INTERNAL_ERROR,
  ].includes(code);

  res.status(statusCode).json(errorResponse(code, message, details, isRetryable));
}

// Send AppError response
export function sendAppError(res: Response, error: AppError): void {
  res.status(error.statusCode).json(appErrorResponse(error));
}

// Paginated response structure
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Create paginated success response
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

// Send paginated response
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  res.status(200).json(paginatedResponse(data, page, limit, total));
}
