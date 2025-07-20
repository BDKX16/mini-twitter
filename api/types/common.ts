/**
 * Common TypeScript type definitions for the Twitter Clone API
 */

// HTTP Status Codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// Error Status Types
export type ErrorStatus = "fail" | "error";

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    name: string;
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface PaginationInfo {
  limit: number;
  skip: number;
  hasMore: boolean;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  data: T & {
    pagination: PaginationInfo;
  };
}

// Rate Limiting Types
export interface RateLimitDetails {
  resetTime?: number;
  remainingRequests?: number;
  windowMs?: number;
  maxRequests?: number;
}

// MongoDB Document ID type
export type ObjectId = string;

// Request Types
export interface AuthenticatedUser {
  id: ObjectId;
  username: string;
  role?: string;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Common Query Parameters
export interface QueryParams {
  limit?: string | number;
  skip?: string | number;
  page?: string | number;
  sort?: string;
  order?: "asc" | "desc";
}

// Search Parameters
export interface SearchParams extends QueryParams {
  q: string;
}

// Date Range Parameters
export interface DateRangeParams {
  startDate?: string | Date;
  endDate?: string | Date;
}
