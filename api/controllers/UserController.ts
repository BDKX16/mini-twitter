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
import { generateToken } from "../middleware/authMiddleware";

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
        username,
        password,
        bio,
        profileImage,
        website,
        location,
      } = req.body;

      // Basic validation
      if (!username) {
        throw new ValidationError("Username is required");
      }

      const userData: CreateUserData = {
        firstName: firstName || username, // Use username as first name if not provided
        lastName,
        username,
        password: password || "",
        bio,
        profileImage,
        website,
        location,
      };

      const user = await this.userService.createUser(userData);

      // Generar token JWT automáticamente al registrarse
      const token = generateToken({
        id: user._id?.toString() || "",
        username: user.username,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user._id?.toString() || "",
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            createdAt: user.createdAt,
          },
          token: token,
          expiresIn: "7d",
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
   * Login user y generar token JWT
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.body;

      if (!username) {
        throw new ValidationError("Username is required");
      }

      const result = await this.userService.loginUser(username);

      // Debug: verificar qué contiene result.user
      console.log("Login result.user:", result.user);
      console.log("result.user.id:", (result.user as any).id);

      // Generar token JWT con manejo más robusto del ID
      const userId = (result.user as any).id?.toString() || "";

      console.log("Generated userId for token:", userId);

      const token = generateToken({
        id: userId,
        username: result.user.username,
        firstName: result.user.firstName || "",
        lastName: result.user.lastName || "",
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: userId,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
          token: token,
          expiresIn: "7d",
        },
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
      const { username } = req.body;

      if (!username) {
        throw new ValidationError("Username is required");
      }

      const result = await this.userService.reactivateAccount(username);

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
}

module.exports = { UserController };
