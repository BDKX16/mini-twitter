/**
 * Tweet Service Implementation in TypeScript
 * Business logic layer for Tweet operations
 */

import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import {
  CreateTweetData,
  UpdateTweetData,
  TweetWithAuthor,
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, ITweetDocument } from "../types/models";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors";

export class TweetService implements IBaseService {
  private tweetRepository: TweetRepository;
  private userRepository: UserRepository;

  constructor() {
    this.tweetRepository = new TweetRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new tweet
   */
  async createTweet(createData: CreateTweetData): Promise<ITweetDocument> {
    try {
      // Validate that user exists
      const user = await this.userRepository.findById(createData.authorId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Validate tweet content
      this.validateTweetContent(createData.content);

      // Extract hashtags and mentions from content
      const hashtags = this.extractHashtags(createData.content);
      const mentionUsernames = this.extractMentions(createData.content);

      // Create tweet
      const tweet = await this.tweetRepository.create({
        author: createData.authorId,
        content: createData.content.trim(),
        images: createData.images || [],
        hashtags: [...(createData.hashtags || []), ...hashtags],
        mentions: createData.mentions || [], // Use provided mentions, not extracted ones
        parentTweetId: createData.parentTweetId,
        createdAt: new Date(),
      } as Partial<ITweetDocument>);

      // Return populated tweet
      const populatedTweet = await this.tweetRepository.findById(tweet._id!);
      return populatedTweet!;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get tweet by ID
   */
  async getTweetById(tweetId: MongooseObjectId): Promise<ITweetDocument> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }
    return tweet;
  }

  /**
   * Get tweets by user
   */
  async getTweetsByUser(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const tweets = await this.tweetRepository.findByAuthor(userId, {
      limit,
      skip,
    });
    return tweets;
  }

  /**
   * Get all tweets with pagination
   */
  async getAllTweets(options: ServiceOptions = {}): Promise<ITweetDocument[]> {
    const {
      limit = 50,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const tweets = await this.tweetRepository.find(
      {},
      {
        limit,
        skip,
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      }
    );

    return tweets;
  }

  /**
   * Update tweet
   */
  async updateTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId,
    updateData: UpdateTweetData
  ): Promise<ITweetDocument> {
    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Verify user is the author
    if (tweet.author.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only edit your own tweets");
    }

    // Validate new content if updating
    if (updateData.content) {
      this.validateTweetContent(updateData.content);
      updateData.content = updateData.content.trim();

      // Update hashtags and mentions if content changed
      const hashtags = this.extractHashtags(updateData.content);
      const mentionUsernames = this.extractMentions(updateData.content);
      updateData.hashtags = [...(updateData.hashtags || []), ...hashtags];

      // For mentions, we would need to look up users by username to get their ObjectIds
      // For now, we'll skip adding new mentions in updates to avoid complexity
      if (mentionUsernames.length > 0) {
        // TODO: Implement user lookup for mentions
        console.warn("Mention extraction in tweet updates not yet implemented");
      }
    }

    const updatedTweet = await this.tweetRepository.updateById(
      tweetId,
      updateData
    );
    if (!updatedTweet) {
      throw new NotFoundError("Tweet not found");
    }

    return updatedTweet;
  }

  /**
   * Delete tweet
   */
  async deleteTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<{ message: string }> {
    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Verify user is the author
    if (tweet.author.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only delete your own tweets");
    }

    const deleted = await this.tweetRepository.deleteById(tweetId);
    if (!deleted) {
      throw new Error("Failed to delete tweet");
    }

    return { message: "Tweet deleted successfully" };
  }

  /**
   * Search tweets
   */
  async searchTweets(
    query: string,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    if (!query || query.trim().length === 0) {
      throw new ValidationError("Search query is required");
    }

    const tweets = await this.tweetRepository.searchByContent(query, {
      limit,
      skip,
    });
    return tweets;
  }

  /**
   * Get tweet statistics
   */
  async getTweetStats(tweetId: MongooseObjectId): Promise<any> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const stats = await this.tweetRepository.getTweetStats(tweetId);
    return {
      tweetId,
      likesCount: stats.likesCount || 0,
      retweetsCount: stats.retweetsCount || 0,
      repliesCount: stats.repliesCount || 0,
      viewsCount: stats.viewsCount || 0,
    };
  }

  /**
   * Get trending tweets
   */
  async getTrendingTweets(
    timeframe: number = 24,
    limit: number = 10
  ): Promise<any[]> {
    const tweets = await this.tweetRepository.getTrending(timeframe, limit);
    return tweets;
  }

  /**
   * Get user timeline
   */
  async getTimeline(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get timeline (tweets from followed users + own tweets)
    const timeline = await this.tweetRepository.getTimelineForUser(userId, {
      limit,
      skip,
    });
    return timeline;
  }

  /**
   * Get mentions for user
   */
  async getMentions(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const mentions = await this.tweetRepository.findByMention(userId, {
      limit,
      skip,
    });
    return mentions;
  }

  /**
   * Get tweets by hashtag
   */
  async getHashtagTweets(
    hashtag: string,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    if (!hashtag || hashtag.trim().length === 0) {
      throw new ValidationError("Hashtag is required");
    }

    // Clean hashtag (remove # if exists)
    const cleanHashtag = hashtag.replace("#", "").toLowerCase();

    const tweets = await this.tweetRepository.getHashtagTweets(cleanHashtag, {
      limit,
      skip,
    });
    return tweets;
  }

  /**
   * Get replies to a tweet
   */
  async getTweetReplies(
    tweetId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const replies = await this.tweetRepository.find(
      { parentTweetId: tweetId },
      { limit, skip, sort: { createdAt: 1 } }
    );
    return replies;
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    content: string
  ): Promise<ITweetDocument> {
    // Verify original tweet exists
    const originalTweet = await this.tweetRepository.findById(tweetId);
    if (!originalTweet) {
      throw new NotFoundError("Original tweet not found");
    }

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Validate reply content
    this.validateTweetContent(content);

    // Create reply
    const reply = await this.createTweet({
      content: content.trim(),
      authorId: userId,
      parentTweetId: tweetId,
    });

    return reply;
  }

  /**
   * Get user tweet statistics
   */
  async getUserTweetStats(userId: MongooseObjectId): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get basic tweet count
    const totalTweets = await this.tweetRepository.count({ author: userId });

    // For now, return basic stats. Could be enhanced with aggregation
    return {
      userId,
      totalTweets,
      totalLikesReceived: 0, // Would need aggregation with likes collection
      totalRetweetsReceived: 0, // Would need aggregation with retweets collection
      averageLikesPerTweet: 0,
      mostLikedTweet: null,
    };
  }

  /**
   * Validate tweet content
   */
  validate(data: { content: string }): ValidationResult {
    return this.validateTweetContent(data.content);
  }

  /**
   * Validate tweet content
   */
  private validateTweetContent(content: string): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push("Tweet content is required");
    }

    if (content.trim().length > 280) {
      errors.push("Tweet content cannot exceed 280 characters");
    }

    // Check for basic inappropriate content
    const inappropriateWords = ["spam", "fake", "scam"]; // Basic list
    const hasInappropriateContent = inappropriateWords.some((word) =>
      content.toLowerCase().includes(word)
    );

    if (hasInappropriateContent) {
      errors.push("Tweet contains inappropriate content");
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
    };

    if (!result.isValid) {
      throw new ValidationError(errors.join(", "));
    }

    return result;
  }

  /**
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    const hashtags = content.match(/#\w+/g) || [];
    return hashtags.map((tag) => tag.toLowerCase().replace("#", ""));
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): string[] {
    const mentions = content.match(/@\w+/g) || [];
    return mentions.map((mention) => mention.replace("@", ""));
  }

  /**
   * Sanitize method for IBaseService
   */
  sanitize(tweet: ITweetDocument): ITweetDocument {
    // For tweets, we don't need to remove sensitive data like with users
    return tweet;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { TweetService };
