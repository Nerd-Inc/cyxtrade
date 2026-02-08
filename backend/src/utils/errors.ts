// Error codes for client handling - organized by category
export enum ErrorCode {
  // Validation errors (1xxx)
  VALIDATION_ERROR = 1001,
  INVALID_PHONE = 1002,
  INVALID_AMOUNT = 1003,
  MISSING_FIELD = 1004,
  INVALID_FORMAT = 1005,
  INVALID_OTP = 1006,
  OTP_EXPIRED = 1007,
  TOO_MANY_ATTEMPTS = 1008,

  // Auth errors (2xxx)
  INVALID_TOKEN = 2001,
  EXPIRED_TOKEN = 2002,
  UNAUTHORIZED = 2003,
  FORBIDDEN = 2004,
  NOT_AUTHENTICATED = 2005,

  // Trade errors (3xxx)
  TRADE_NOT_FOUND = 3001,
  INVALID_TRADE_STATE = 3002,
  INSUFFICIENT_BOND = 3003,
  TRADE_EXPIRED = 3004,
  TRADE_ALREADY_ACCEPTED = 3005,
  TRADE_CANNOT_BE_CANCELLED = 3006,
  TRADE_ALREADY_RATED = 3007,

  // Trader errors (4xxx)
  TRADER_NOT_FOUND = 4001,
  TRADER_OFFLINE = 4002,
  NO_PAYMENT_METHOD = 4003,
  NOT_A_TRADER = 4004,
  PAYMENT_METHOD_NOT_FOUND = 4005,
  TRADER_ALREADY_EXISTS = 4006,

  // Upload errors (5xxx)
  FILE_TOO_LARGE = 5001,
  INVALID_FILE_TYPE = 5002,
  UPLOAD_FAILED = 5003,
  NO_FILE_PROVIDED = 5004,

  // User errors (6xxx)
  USER_NOT_FOUND = 6001,
  USER_ALREADY_EXISTS = 6002,
  PROFILE_UPDATE_FAILED = 6003,

  // Crypto/Key errors (7xxx)
  KEY_NOT_FOUND = 7001,
  INVALID_KEY = 7002,
  DECRYPTION_FAILED = 7003,
  KEY_EXCHANGE_FAILED = 7004,

  // Server errors (9xxx)
  DATABASE_ERROR = 9001,
  EXTERNAL_SERVICE_ERROR = 9002,
  RATE_LIMITED = 9003,
  INTERNAL_ERROR = 9999,
}

// Map error codes to default messages
const defaultMessages: Record<ErrorCode, string> = {
  // Validation
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',
  [ErrorCode.INVALID_PHONE]: 'Please enter a valid phone number',
  [ErrorCode.INVALID_AMOUNT]: 'Please enter a valid amount',
  [ErrorCode.MISSING_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format',
  [ErrorCode.INVALID_OTP]: 'Invalid verification code',
  [ErrorCode.OTP_EXPIRED]: 'Verification code has expired',
  [ErrorCode.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please request a new code',

  // Auth
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token',
  [ErrorCode.EXPIRED_TOKEN]: 'Session expired. Please log in again',
  [ErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action',
  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.NOT_AUTHENTICATED]: 'Please log in to continue',

  // Trade
  [ErrorCode.TRADE_NOT_FOUND]: 'Trade not found',
  [ErrorCode.INVALID_TRADE_STATE]: 'This action cannot be performed on the trade in its current state',
  [ErrorCode.INSUFFICIENT_BOND]: 'Trader has insufficient bond for this trade',
  [ErrorCode.TRADE_EXPIRED]: 'This trade has expired',
  [ErrorCode.TRADE_ALREADY_ACCEPTED]: 'This trade has already been accepted',
  [ErrorCode.TRADE_CANNOT_BE_CANCELLED]: 'This trade cannot be cancelled',
  [ErrorCode.TRADE_ALREADY_RATED]: 'You have already rated this trade',

  // Trader
  [ErrorCode.TRADER_NOT_FOUND]: 'Trader not found',
  [ErrorCode.TRADER_OFFLINE]: 'This trader is currently offline',
  [ErrorCode.NO_PAYMENT_METHOD]: 'Trader has no payment method configured',
  [ErrorCode.NOT_A_TRADER]: 'You are not registered as a trader',
  [ErrorCode.PAYMENT_METHOD_NOT_FOUND]: 'Payment method not found',
  [ErrorCode.TRADER_ALREADY_EXISTS]: 'You are already registered as a trader',

  // Upload
  [ErrorCode.FILE_TOO_LARGE]: 'File is too large. Maximum size is 5MB',
  [ErrorCode.INVALID_FILE_TYPE]: 'Invalid file type. Please upload an image',
  [ErrorCode.UPLOAD_FAILED]: 'Failed to upload file',
  [ErrorCode.NO_FILE_PROVIDED]: 'No file was provided',

  // User
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.PROFILE_UPDATE_FAILED]: 'Failed to update profile',

  // Crypto
  [ErrorCode.KEY_NOT_FOUND]: 'Encryption key not found',
  [ErrorCode.INVALID_KEY]: 'Invalid encryption key',
  [ErrorCode.DECRYPTION_FAILED]: 'Failed to decrypt message',
  [ErrorCode.KEY_EXCHANGE_FAILED]: 'Key exchange failed',

  // Server
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please try again later',
  [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later',
};

// Map error codes to HTTP status codes
const statusCodes: Record<ErrorCode, number> = {
  // Validation - 400
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_PHONE]: 400,
  [ErrorCode.INVALID_AMOUNT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.INVALID_OTP]: 400,
  [ErrorCode.OTP_EXPIRED]: 400,
  [ErrorCode.TOO_MANY_ATTEMPTS]: 429,

  // Auth - 401/403
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.EXPIRED_TOKEN]: 401,
  [ErrorCode.UNAUTHORIZED]: 403,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_AUTHENTICATED]: 401,

  // Trade - 400/404
  [ErrorCode.TRADE_NOT_FOUND]: 404,
  [ErrorCode.INVALID_TRADE_STATE]: 400,
  [ErrorCode.INSUFFICIENT_BOND]: 400,
  [ErrorCode.TRADE_EXPIRED]: 400,
  [ErrorCode.TRADE_ALREADY_ACCEPTED]: 400,
  [ErrorCode.TRADE_CANNOT_BE_CANCELLED]: 400,
  [ErrorCode.TRADE_ALREADY_RATED]: 400,

  // Trader - 400/404
  [ErrorCode.TRADER_NOT_FOUND]: 404,
  [ErrorCode.TRADER_OFFLINE]: 400,
  [ErrorCode.NO_PAYMENT_METHOD]: 400,
  [ErrorCode.NOT_A_TRADER]: 403,
  [ErrorCode.PAYMENT_METHOD_NOT_FOUND]: 404,
  [ErrorCode.TRADER_ALREADY_EXISTS]: 400,

  // Upload - 400
  [ErrorCode.FILE_TOO_LARGE]: 400,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.UPLOAD_FAILED]: 500,
  [ErrorCode.NO_FILE_PROVIDED]: 400,

  // User - 404
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_ALREADY_EXISTS]: 400,
  [ErrorCode.PROFILE_UPDATE_FAILED]: 500,

  // Crypto - 400/404
  [ErrorCode.KEY_NOT_FOUND]: 404,
  [ErrorCode.INVALID_KEY]: 400,
  [ErrorCode.DECRYPTION_FAILED]: 400,
  [ErrorCode.KEY_EXCHANGE_FAILED]: 500,

  // Server - 500/503/429
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 503,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

// Errors that can be retried by the client
const retryableErrors: Set<ErrorCode> = new Set([
  ErrorCode.DATABASE_ERROR,
  ErrorCode.EXTERNAL_SERVICE_ERROR,
  ErrorCode.RATE_LIMITED,
  ErrorCode.INTERNAL_ERROR,
]);

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>
  ) {
    super(message || defaultMessages[code]);
    this.code = code;
    this.statusCode = statusCodes[code];
    this.details = details;
    this.isRetryable = retryableErrors.has(code);
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      isRetryable: this.isRetryable,
    };
  }
}

// Helper functions to create common errors
export const createValidationError = (message: string, field?: string) =>
  new AppError(ErrorCode.VALIDATION_ERROR, message, field ? { field } : undefined);

export const createMissingFieldError = (field: string) =>
  new AppError(ErrorCode.MISSING_FIELD, `${field} is required`, { field });

export const createNotFoundError = (resource: string) =>
  new AppError(
    resource === 'Trade' ? ErrorCode.TRADE_NOT_FOUND :
    resource === 'Trader' ? ErrorCode.TRADER_NOT_FOUND :
    resource === 'User' ? ErrorCode.USER_NOT_FOUND :
    ErrorCode.INTERNAL_ERROR,
    `${resource} not found`
  );

export const createUnauthorizedError = (message?: string) =>
  new AppError(ErrorCode.UNAUTHORIZED, message);

export const createForbiddenError = (message?: string) =>
  new AppError(ErrorCode.FORBIDDEN, message);
