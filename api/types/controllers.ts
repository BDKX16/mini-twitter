/**
 * Controller types and utilities
 */

import { Request } from "express";
import { Types } from "mongoose";

// Extended Request interface for authenticated requests
export interface AuthenticatedRequest extends Omit<Request, "user"> {
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

// Utility function to convert string to ObjectId
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

// Validate ObjectId format
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}
