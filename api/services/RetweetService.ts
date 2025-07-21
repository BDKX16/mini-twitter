/**
 * Retweet Service Implementation in TypeScript
 * Business logic layer for Retweet operations
 */

import { RetweetRepository } from "../infraestructure/database/RetweetRepository";
import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import {
  CreateRetweetData,
  RetweetResult,
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, IRetweetDocument } from "../types/models";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errors";

export class RetweetService implements IBaseService {
  private retweetRepository: RetweetRepository;
  private tweetRepository: TweetRepository;
  private userRepository: UserRepository;

  constructor() {
    this.retweetRepository = new RetweetRepository();
    this.tweetRepository = new TweetRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Retweet a tweet
   */
  async retweetTweet(data: CreateRetweetData): Promise<{
    tweet: any;
    message: string;
    retweetsCount: number;
    isRetweeted: boolean;
  }> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify tweet exists
      const tweet = await this.tweetRepository.findById(data.tweetId);
      if (!tweet) {
        throw new NotFoundError("Tweet not found");
      }

      // Check if user has already retweeted this tweet
      const hasRetweeted = await this.tweetRepository.hasUserRetweetedTweet(
        data.tweetId,
        data.userId
      );
      if (hasRetweeted) {
        throw new ConflictError("You have already retweeted this tweet");
      }

      // Add retweet to tweet atomically (updates the tweet's retweets array)
      const updatedTweet = await this.tweetRepository.addRetweetToTweet(
        data.tweetId,
        data.userId
      );

      if (!updatedTweet) {
        throw new ConflictError(
          "Tweet may have already been retweeted by user"
        );
      }

      // Also create a separate retweet record for analytics/timeline purposes
      const retweetRecord = await this.retweetRepository.create({
        user: data.userId,
        tweet: data.tweetId,
        comment: data.comment || "",
        createdAt: new Date(),
      } as Partial<IRetweetDocument>);

      return {
        tweet: updatedTweet,
        message: "Tweet retweeted successfully",
        retweetsCount: updatedTweet.retweetsCount,
        isRetweeted: true,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Unretweet a tweet
   */
  async unretweetTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{
    tweet: any;
    message: string;
    retweetsCount: number;
    isRetweeted: boolean;
  }> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify tweet exists
      const tweet = await this.tweetRepository.findById(tweetId);
      if (!tweet) {
        throw new NotFoundError("Tweet not found");
      }

      // Check if user has retweeted this tweet
      const hasRetweeted = await this.tweetRepository.hasUserRetweetedTweet(
        tweetId,
        userId
      );
      if (!hasRetweeted) {
        throw new NotFoundError("You have not retweeted this tweet");
      }

      // Remove retweet from tweet atomically (updates the tweet's retweets array)
      const updatedTweet = await this.tweetRepository.removeRetweetFromTweet(
        tweetId,
        userId
      );

      if (!updatedTweet) {
        throw new Error("Failed to remove retweet from tweet");
      }

      // Also remove the separate retweet record
      const existingRetweet = await this.retweetRepository.findByUserAndTweet(
        userId,
        tweetId
      );
      if (existingRetweet) {
        await this.retweetRepository.deleteById(existingRetweet._id!);
      }

      return {
        tweet: updatedTweet,
        message: "Tweet unretweeted successfully",
        retweetsCount: updatedTweet.retweetsCount,
        isRetweeted: false,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Toggle retweet/unretweet
   */
  async toggleRetweet(data: CreateRetweetData): Promise<RetweetResult> {
    try {
      const result = await this.retweetRepository.toggleRetweet(
        data.userId,
        data.tweetId,
        data.comment
      );

      const retweetsCount = await this.retweetRepository.countByTweet(
        data.tweetId
      );

      return {
        action: result.action as "retweeted" | "unretweeted",
        retweet: result.retweet,
        retweetsCount,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get retweets of a tweet
   */
  async getTweetRetweets(
    tweetId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    tweetId: MongooseObjectId;
    retweets: any[];
    totalRetweets: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const retweets = await this.retweetRepository.findByTweet(tweetId, {
      limit,
      skip,
      populate: "user",
    });

    const totalRetweets = await this.retweetRepository.countByTweet(tweetId);

    return {
      tweetId,
      retweets: retweets.map((retweet: any) => ({
        userId: retweet.user._id,
        firstName: retweet.user.firstName,
        lastName: retweet.user.lastName,
        username: retweet.user.username,
        profileImage: retweet.user.profileImage,
        comment: retweet.comment,
        retweetedAt: retweet.createdAt,
        isQuoteRetweet: !!(
          retweet.comment && retweet.comment.trim().length > 0
        ),
      })),
      totalRetweets,
    };
  }

  /**
   * Get user's retweets
   */
  async getUserRetweets(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    retweets: any[];
    totalRetweets: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const retweets = await this.retweetRepository.findByUser(userId, {
      limit,
      skip,
      populate: "tweet",
    });

    const totalRetweets = await this.retweetRepository.countByUser(userId);

    return {
      userId,
      retweets: retweets.map((retweet: any) => ({
        tweetId: retweet.tweet._id,
        tweetContent: retweet.tweet.content,
        tweetAuthor: retweet.tweet.author,
        comment: retweet.comment,
        retweetedAt: retweet.createdAt,
        isQuoteRetweet: !!(
          retweet.comment && retweet.comment.trim().length > 0
        ),
      })),
      totalRetweets,
    };
  }

  /**
   * Get quote retweets
   */
  async getQuoteRetweets(
    tweetId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<IRetweetDocument[]> {
    if (tweetId) {
      // Verify tweet exists
      const tweet = await this.tweetRepository.findById(tweetId);
      if (!tweet) {
        throw new NotFoundError("Tweet not found");
      }
    }

    return await this.retweetRepository.findQuoteRetweets(tweetId, options);
  }

  /**
   * Check if user has retweeted a tweet
   */
  async hasUserRetweetedTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean> {
    const retweet = await this.retweetRepository.findByUserAndTweet(
      userId,
      tweetId
    );
    return retweet !== null;
  }

  /**
   * Get most retweeted tweets
   */
  async getMostRetweetedTweets(limit: number = 10): Promise<any[]> {
    const tweets = await this.retweetRepository.getMostRetweetedTweets(limit);
    return tweets;
  }

  /**
   * Get retweet statistics for a user
   */
  async getUserRetweetStats(userId: MongooseObjectId): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const stats = await this.retweetRepository.getUserRetweetStats(userId);
    return stats;
  }

  /**
   * Get retweets count for a tweet
   */
  async getTweetRetweetsCount(tweetId: MongooseObjectId): Promise<number> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    return await this.retweetRepository.countByTweet(tweetId);
  }

  /**
   * Validate retweet operation
   */
  validate(data: CreateRetweetData): ValidationResult {
    const errors: string[] = [];

    if (!data.userId) {
      errors.push("User ID is required");
    }

    if (!data.tweetId) {
      errors.push("Tweet ID is required");
    }

    if (data.comment && data.comment.length > 280) {
      errors.push("Comment cannot exceed 280 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize retweet data
   */
  sanitize(retweet: IRetweetDocument): IRetweetDocument {
    // No sensitive data to remove from retweets
    return retweet;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { RetweetService };
