import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../utils/errors';
import { appErrorResponse, errorResponse } from '../utils/response';

// Re-export AppError for backwards compatibility
export { AppError, ErrorCode } from '../utils/errors';

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error details
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle AppError with structured response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(appErrorResponse(err));
  }

  // Handle validation errors from express-validator or Zod
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json(
      errorResponse(
        ErrorCode.VALIDATION_ERROR,
        err.message || 'Validation failed',
        process.env.NODE_ENV === 'development' ? { originalError: err.message } : undefined
      )
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      errorResponse(ErrorCode.INVALID_TOKEN, 'Invalid authentication token')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorResponse(ErrorCode.EXPIRED_TOKEN, 'Session expired. Please log in again')
    );
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    const multerError = err as any;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(
        errorResponse(ErrorCode.FILE_TOO_LARGE, 'File is too large. Maximum size is 5MB')
      );
    }
    return res.status(400).json(
      errorResponse(ErrorCode.UPLOAD_FAILED, multerError.message || 'File upload failed')
    );
  }

  // Handle database errors
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('database')) {
    return res.status(503).json(
      errorResponse(
        ErrorCode.DATABASE_ERROR,
        'Service temporarily unavailable. Please try again later',
        undefined,
        true // isRetryable
      )
    );
  }

  // Unexpected error - don't leak details in production
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json(
    errorResponse(
      ErrorCode.INTERNAL_ERROR,
      isDev ? err.message : 'Something went wrong. Please try again later',
      isDev ? { stack: err.stack } : undefined,
      true // isRetryable
    )
  );
};

// Async handler wrapper - catches async errors and passes to error handler
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    errorResponse(
      ErrorCode.INTERNAL_ERROR,
      `Route not found: ${req.method} ${req.path}`,
      { path: req.path, method: req.method }
    )
  );
};
