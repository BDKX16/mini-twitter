/**
 * Like Controller - TypeScript version
 * Handles HTTP requests for like-related operations
 */

import { Request, Response, NextFunction } from "express";
import { LikeService } from "../services/LikeService";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";

export class LikeController {
  private likeService: LikeService;

  constructor() {
    this.likeService = new LikeService();
  }

  /**
   * Like a tweet
   * POST /api/tweets/:tweetId/like
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
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
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
   * DELETE /api/tweets/:tweetId/like
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
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
      }

      const result = await this.likeService.unlikeTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle like/unlike
   * PUT /api/tweets/:tweetId/like/toggle
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
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
      }

      const result = await this.likeService.toggleLike(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.status(200).json({
        success: true,
        message: `Tweet ${result.action} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get likes for a tweet
   * GET /api/tweets/:tweetId/likes
   */
  async getTweetLikes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { limit = "50", skip = "0" } = req.query;

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
      }

      // Parse pagination parameters
      const parsedLimit = Math.max(
        1,
        Math.min(100, parseInt(limit as string) || 50)
      );
      const parsedSkip = Math.max(0, parseInt(skip as string) || 0);

      const likes = await this.likeService.getTweetLikes(toObjectId(tweetId), {
        limit: parsedLimit,
        skip: parsedSkip,
      });

      res.status(200).json({
        success: true,
        message: "Tweet likes retrieved successfully",
        data: likes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweets liked by a user
   * GET /api/users/:userId/likes
   */
  async getUserLikes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = "50", skip = "0" } = req.query;

      if (!isValidObjectId(userId)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
        return;
      }

      // Parse pagination parameters
      const parsedLimit = Math.max(
        1,
        Math.min(100, parseInt(limit as string) || 50)
      );
      const parsedSkip = Math.max(0, parseInt(skip as string) || 0);

      const likes = await this.likeService.getUserLikes(toObjectId(userId), {
        limit: parsedLimit,
        skip: parsedSkip,
      });

      res.status(200).json({
        success: true,
        message: "User likes retrieved successfully",
        data: likes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user has liked a tweet
   * GET /api/tweets/:tweetId/like/status
   */
  async checkLikeStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
      }

      const hasLiked = await this.likeService.isLiked(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.status(200).json({
        success: true,
        message: "Like status retrieved successfully",
        data: {
          hasLiked,
          userId,
          tweetId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get like statistics for a tweet
   * GET /api/tweets/:tweetId/likes/stats
   */
  async getLikeStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
        res.status(400).json({
          success: false,
          message: "Invalid tweet ID format",
        });
        return;
      }

      const stats = await this.likeService.getUserLikeStats(
        toObjectId(tweetId)
      );

      res.status(200).json({
        success: true,
        message: "Like statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get most liked tweets (trending)
   * GET /api/likes/trending
   */
  async getMostLikedTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = "10", timeframe = "24" } = req.query;

      // Parse parameters
      const parsedLimit = Math.max(
        1,
        Math.min(50, parseInt(limit as string) || 10)
      );
      const parsedTimeframe = Math.max(
        1,
        Math.min(168, parseInt(timeframe as string) || 24)
      ); // Max 1 week

      const tweets = await this.likeService.getMostLikedTweets(parsedLimit);

      res.status(200).json({
        success: true,
        message: "Most liked tweets retrieved successfully",
        data: {
          tweets,
          limit: parsedLimit,
          timeframe: `${parsedTimeframe} hours`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent likes activity for timeline
   * GET /api/likes/activity/recent
   */
  async getRecentLikesActivity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = "20", hours = "24" } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      // Parse parameters
      const parsedLimit = Math.max(
        1,
        Math.min(100, parseInt(limit as string) || 20)
      );
      const parsedHours = Math.max(
        1,
        Math.min(168, parseInt(hours as string) || 24)
      );

      const activity = await this.likeService.getRecentLikesActivity(
        toObjectId(userId),
        parsedHours,
        parsedLimit
      );

      res.status(200).json({
        success: true,
        message: "Recent likes activity retrieved successfully",
        data: {
          activity,
          timeframe: `${parsedHours} hours`,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk like operation (like multiple tweets)
   * POST /api/likes/bulk
   */
  async bulkLike(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      // Validate input
      if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Tweet IDs array is required and cannot be empty",
        });
        return;
      }

      // Validate all tweet IDs
      for (const tweetId of tweetIds) {
        if (!isValidObjectId(tweetId)) {
          res.status(400).json({
            success: false,
            message: `Invalid tweet ID format: ${tweetId}`,
          });
          return;
        }
      }

      // Limit bulk operations
      if (tweetIds.length > 20) {
        res.status(400).json({
          success: false,
          message: "Cannot like more than 20 tweets at once",
        });
        return;
      }

      const results = await this.likeService.bulkLike(
        toObjectId(userId),
        tweetIds.map((id) => toObjectId(id))
      );

      res.status(200).json({
        success: true,
        message: "Bulk like operation completed",
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's like statistics
   * GET /api/users/:userId/likes/stats
   */
  async getUserLikeStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
        return;
      }

      const stats = await this.likeService.getUserLikeStats(toObjectId(userId));

      res.status(200).json({
        success: true,
        message: "User like statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending tweets based on likes in a timeframe
   * GET /api/likes/trending/timeframe
   */
  async getTrendingByLikes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { timeframe = "24", limit = "10", period = "hours" } = req.query;

      // Parse parameters
      const parsedTimeframe = Math.max(
        1,
        Math.min(168, parseInt(timeframe as string) || 24)
      ); // Max 1 week
      const parsedLimit = Math.max(
        1,
        Math.min(50, parseInt(limit as string) || 10)
      );

      const trendingTweets = await this.likeService.getTrendingByLikes(
        parsedTimeframe,
        parsedLimit,
        period as string
      );

      res.status(200).json({
        success: true,
        message: "Trending tweets by likes retrieved successfully",
        data: {
          tweets: trendingTweets,
          timeframe: parsedTimeframe,
          period,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get likes activity feed for user's timeline
   * GET /api/likes/feed
   */
  async getLikesActivityFeed(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = "20", skip = "0" } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User must be authenticated",
        });
        return;
      }

      // Parse pagination parameters
      const parsedLimit = Math.max(
        1,
        Math.min(100, parseInt(limit as string) || 20)
      );
      const parsedSkip = Math.max(0, parseInt(skip as string) || 0);

      const feed = await this.likeService.getLikesActivityFeed(
        toObjectId(userId),
        {
          limit: parsedLimit,
          skip: parsedSkip,
        }
      );

      res.status(200).json({
        success: true,
        message: "Likes activity feed retrieved successfully",
        data: feed,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { LikeController };
