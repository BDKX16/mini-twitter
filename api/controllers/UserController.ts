/**
 * User Controller - TypeScript version
 * Handles HTTP requests for user-related operations
 */

import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService";
import { CreateUserData, UpdateUserData } from "../types/services";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Register a new user
   */
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        bio,
        profileImage,
        website,
        location,
      } = req.body;

      // Basic validation
      if (!firstName || !email) {
        throw new ValidationError("First name and email are required");
      }

      const userData: CreateUserData = {
        firstName,
        lastName,
        email,
        password,
        bio,
        profileImage,
        website,
        location,
      };

      const user = await this.userService.createUser(userData);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const profile = await this.userService.getUserProfile(toObjectId(userId));

      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;

      if (!userId || !isValidObjectId(userId)) {
        throw new ValidationError("Valid user ID is required");
      }

      const updateData: UpdateUserData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        bio: req.body.bio,
        profileImage: req.body.profileImage,
        website: req.body.website,
        location: req.body.location,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof UpdateUserData] === undefined) {
          delete updateData[key as keyof UpdateUserData];
        }
      });

      const updatedUser = await this.userService.updateUser(
        toObjectId(userId),
        updateData
      );

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;

      if (!userId || !isValidObjectId(userId)) {
        throw new ValidationError("Valid user ID is required");
      }

      await this.userService.deleteUser(toObjectId(userId));

      res.json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const user = await this.userService.getUserById(toObjectId(userId));

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users
   */
  async searchUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { q: query, limit = 20, skip = 0 } = req.query;

      if (!query || typeof query !== "string") {
        throw new ValidationError("Search query is required");
      }

      const users = await this.userService.searchUsers(query, {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const stats = await this.userService.getUserStats(toObjectId(userId));

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const result = await this.userService.loginUser(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate account
   */
  async reactivateAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError("Email is required");
      }

      const result = await this.userService.reactivateAccount(email);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      const user = await this.userService.getUserById(toObjectId(req.user.id));

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError(
          "Current password and new password are required"
        );
      }

      await this.userService.changePassword(
        toObjectId(req.user.id),
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      await this.userService.deactivateAccount(toObjectId(req.user.id));

      res.json({
        success: true,
        message: "Account deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suggested users
   */
  async getSuggestedUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new ValidationError("User not authenticated");
      }

      const { limit = 10 } = req.query;

      const users = await this.userService.getSuggestedUsers(
        toObjectId(req.user.id),
        Number(limit)
      );

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username } = req.params;

      if (!username) {
        throw new ValidationError("Username is required");
      }

      const isAvailable = await this.userService.checkUsernameAvailability(
        username
      );

      res.json({
        success: true,
        data: { available: isAvailable },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check email availability
   */
  async checkEmailAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        throw new ValidationError("Email is required");
      }

      const isAvailable = await this.userService.checkEmailAvailability(email);

      res.json({
        success: true,
        data: { available: isAvailable },
      });
    } catch (error) {
      next(error);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { UserController };
