/**
 * Custom error classes for better error handling in the Twitter Clone API
 * Provides typed error classes with proper HTTP status codes and metadata
 */

import { HttpStatusCode, ErrorStatus, RateLimitDetails } from "../types/common";

/**
 * Base application error class that extends the native Error class
 * All custom errors should inherit from this class
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly status: ErrorStatus;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation error (400 Bad Request)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  public readonly fields?: string[];

  constructor(message: string, fields?: string[]) {
    super(message, HttpStatusCode.BAD_REQUEST);
    this.name = "ValidationError";
    this.fields = fields;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

/**
 * Resource not found error (404 Not Found)
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;
  public readonly resourceId?: string;

  constructor(message: string, resource?: string, resourceId?: string) {
    super(message, HttpStatusCode.NOT_FOUND);
    this.name = "NotFoundError";
    this.resource = resource;
    this.resourceId = resourceId;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      resource: this.resource,
      resourceId: this.resourceId,
    };
  }
}

/**
 * Resource conflict error (409 Conflict)
 * Used when a resource already exists or there's a business logic conflict
 */
export class ConflictError extends AppError {
  public readonly conflictType?: string;
  public readonly conflictValue?: string;

  constructor(message: string, conflictType?: string, conflictValue?: string) {
    super(message, HttpStatusCode.CONFLICT);
    this.name = "ConflictError";
    this.conflictType = conflictType;
    this.conflictValue = conflictValue;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      conflictType: this.conflictType,
      conflictValue: this.conflictValue,
    };
  }
}

/**
 * Unauthorized access error (401 Unauthorized)
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, HttpStatusCode.UNAUTHORIZED);
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden access error (403 Forbidden)
 * Used when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  public readonly requiredPermission?: string;

  constructor(
    message: string = "Access forbidden",
    requiredPermission?: string
  ) {
    super(message, HttpStatusCode.FORBIDDEN);
    this.name = "ForbiddenError";
    this.requiredPermission = requiredPermission;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      requiredPermission: this.requiredPermission,
    };
  }
}

/**
 * Internal server error (500 Internal Server Error)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error occurred") {
    super(message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    this.name = "InternalServerError";
  }
}

/**
 * Bad request error (400 Bad Request)
 * Used for malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, HttpStatusCode.BAD_REQUEST);
    this.name = "BadRequestError";
  }
}

/**
 * Database operation error (500 Internal Server Error)
 * Used when database operations fail
 */
export class DatabaseError extends AppError {
  public readonly operation?: string;
  public readonly collection?: string;

  constructor(message: string, operation?: string, collection?: string) {
    super(message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    this.name = "DatabaseError";
    this.operation = operation;
    this.collection = collection;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      collection: this.collection,
    };
  }
}

/**
 * Authentication error (401 Unauthorized)
 * Used when authentication credentials are invalid
 */
export class AuthenticationError extends AppError {
  public readonly authType?: string;

  constructor(message: string = "Invalid credentials", authType?: string) {
    super(message, HttpStatusCode.UNAUTHORIZED);
    this.name = "AuthenticationError";
    this.authType = authType;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      authType: this.authType,
    };
  }
}

/**
 * Rate limit exceeded error (429 Too Many Requests)
 * Used when rate limiting thresholds are exceeded
 */
export class RateLimitError extends AppError {
  public readonly details: RateLimitDetails;
  public readonly resetTime?: number;

  constructor(
    message: string = "Rate limit exceeded",
    details: RateLimitDetails = {}
  ) {
    super(message, HttpStatusCode.TOO_MANY_REQUESTS);
    this.name = "RateLimitError";
    this.details = details;
    this.resetTime = details.resetTime;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      details: this.details,
      resetTime: this.resetTime,
    };
  }
}

/**
 * Service unavailable error (503 Service Unavailable)
 * Used when external services are down or overloaded
 */
export class ServiceUnavailableError extends AppError {
  public readonly service?: string;
  public readonly retryAfter?: number;

  constructor(
    message: string = "Service temporarily unavailable",
    service?: string,
    retryAfter?: number
  ) {
    super(message, HttpStatusCode.SERVICE_UNAVAILABLE);
    this.name = "ServiceUnavailableError";
    this.service = service;
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      service: this.service,
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Type guard to check if an error is an instance of AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected) or programming error
 */
export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error factory function to create appropriate error instances
 */
export function createError(
  type:
    | "validation"
    | "notFound"
    | "conflict"
    | "unauthorized"
    | "forbidden"
    | "badRequest"
    | "database"
    | "authentication"
    | "rateLimit"
    | "serviceUnavailable",
  message: string,
  metadata?: any
): AppError {
  switch (type) {
    case "validation":
      return new ValidationError(message, metadata?.fields);
    case "notFound":
      return new NotFoundError(
        message,
        metadata?.resource,
        metadata?.resourceId
      );
    case "conflict":
      return new ConflictError(
        message,
        metadata?.conflictType,
        metadata?.conflictValue
      );
    case "unauthorized":
      return new UnauthorizedError(message);
    case "forbidden":
      return new ForbiddenError(message, metadata?.requiredPermission);
    case "badRequest":
      return new BadRequestError(message);
    case "database":
      return new DatabaseError(
        message,
        metadata?.operation,
        metadata?.collection
      );
    case "authentication":
      return new AuthenticationError(message, metadata?.authType);
    case "rateLimit":
      return new RateLimitError(message, metadata?.details);
    case "serviceUnavailable":
      return new ServiceUnavailableError(
        message,
        metadata?.service,
        metadata?.retryAfter
      );
    default:
      return new AppError(message);
  }
}
