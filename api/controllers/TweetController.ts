/**
 * Tweet Controller - TypeScript version
 * Handles HTTP requests for tweet-related operations
 */

import { Request, Response, NextFunction } from "express";
import { TweetService } from "../services/TweetService";
import { CreateTweetData, UpdateTweetData } from "../types/services";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class TweetController {
  private tweetService: TweetService;

  constructor() {
    this.tweetService = new TweetService();
  }

  /**
   * Create a new tweet
   */
  async createTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      const { content, images, parentTweetId } = req.body;

      if (!content || content.trim().length === 0) {
        throw new ValidationError("Tweet content is required");
      }

      const tweetData: CreateTweetData = {
        content,
        authorId: toObjectId(userId),
        images,
        parentTweetId: parentTweetId ? toObjectId(parentTweetId) : undefined,
      };

      const tweet = await this.tweetService.createTweet(tweetData);

      res.status(201).json({
        success: true,
        message: "Tweet created successfully",
        data: { tweet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet by ID
   */
  async getTweetById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const tweet = await this.tweetService.getTweetById(toObjectId(tweetId));

      res.json({
        success: true,
        data: { tweet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tweet
   */
  async updateTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const updateData: UpdateTweetData = {
        content: req.body.content,
        images: req.body.images,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof UpdateTweetData] === undefined) {
          delete updateData[key as keyof UpdateTweetData];
        }
      });

      const updatedTweet = await this.tweetService.updateTweet(
        toObjectId(tweetId),
        toObjectId(userId),
        updateData
      );

      res.json({
        success: true,
        message: "Tweet updated successfully",
        data: { tweet: updatedTweet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete tweet
   */
  async deleteTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      await this.tweetService.deleteTweet(
        toObjectId(tweetId),
        toObjectId(userId)
      );

      res.json({
        success: true,
        message: "Tweet deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweets by author
   */
  async getTweetsByAuthor(
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

      const tweets = await this.tweetService.getTweetsByUser(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tweets (public timeline)
   */
  async getAllTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const tweets = await this.tweetService.getAllTweets({
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search tweets
   */
  async searchTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { q: query, limit = 20, skip = 0 } = req.query;

      if (!query || typeof query !== "string") {
        throw new ValidationError("Search query is required");
      }

      const tweets = await this.tweetService.searchTweets(query, {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending tweets
   */
  async getTrendingTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 20 } = req.query;

      const tweets = await this.tweetService.getTrendingTweets(Number(limit));

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet replies
   */
  async getTweetReplies(
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

      const replies = await this.tweetService.getTweetReplies(
        toObjectId(tweetId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: { replies },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reply to tweet
   */
  async replyToTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        throw new ValidationError("Reply content is required");
      }

      const replyData: CreateTweetData = {
        content,
        authorId: toObjectId(userId),
        parentTweetId: toObjectId(tweetId),
      };

      const reply = await this.tweetService.createTweet(replyData);

      res.status(201).json({
        success: true,
        message: "Reply created successfully",
        data: { tweet: reply },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mentions for authenticated user
   */
  async getMentions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        throw new ValidationError("User not authenticated");
      }

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const mentions = await this.tweetService.getMentions(toObjectId(userId), {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: { mentions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet statistics
   */
  async getTweetStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const stats = await this.tweetService.getTweetStats(toObjectId(tweetId));

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user tweet statistics
   */
  async getUserTweetStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const stats = await this.tweetService.getUserTweetStats(
        toObjectId(userId)
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
   * Get user tweets (alias for getUserTweetStats to maintain compatibility)
   */
  async getUserTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const tweets = await this.tweetService.getTweetsByUser(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: (Number(page) - 1) * Number(limit),
        }
      );

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweets by hashtag
   */
  async getHashtagTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { hashtag } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!hashtag) {
        throw new ValidationError("Hashtag is required");
      }

      const tweets = await this.tweetService.getHashtagTweets(hashtag, {
        limit: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      });

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user timeline
   */
  async getTimeline(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;

      if (!req.user) {
        throw new ValidationError("User not authenticated");
      }

      const timeline = await this.tweetService.getTimeline(
        toObjectId(req.user.id),
        {
          limit: Number(limit),
          skip: (Number(page) - 1) * Number(limit),
        }
      );

      res.json({
        success: true,
        data: { timeline },
      });
    } catch (error) {
      next(error);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { TweetController };
