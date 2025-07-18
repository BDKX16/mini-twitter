/**
 * Like Controller - TypeScript version
 * Handles HTTP requests for like/unlike operations
 */

import { Request, Response, NextFunction } from "express";
import { LikeService } from "../services/LikeService";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class LikeController {
  private likeService: LikeService;

  constructor() {
    this.likeService = new LikeService();
  }

  /**
   * Like a tweet
   */
  async likeTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const result = await this.likeService.likeTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.status(201).json({
        success: true,
        message: "Tweet liked successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      await this.likeService.unlikeTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        message: "Tweet unliked successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle like/unlike
   */
  async toggleLike(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const result = await this.likeService.toggleLike(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        message: `Tweet ${result.action} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet likes
   */
  async getTweetLikes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const result = await this.likeService.getTweetLikes(toObjectId(tweetId), {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user likes
   */
  async getUserLikes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const result = await this.likeService.getUserLikes(toObjectId(userId), {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user liked a tweet
   */
  async hasUserLikedTweet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, tweetId } = req.params;

      if (!isValidObjectId(userId) || !isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid user or tweet ID");
      }

      const hasLiked = await this.likeService.hasUserLikedTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        data: { hasLiked },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get like statistics
   */
  async getLikeStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const stats = await this.likeService.getUserLikeStats(
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get most liked tweets
   */
  async getMostLikedTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const tweets = await this.likeService.getMostLikedTweets(Number(limit));

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { LikeController };
