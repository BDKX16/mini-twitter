/**
 * Redis Configuration for Twitter Clone API
 * Handles Redis connection, caching, and rate limiting operations
 */

import { createClient, RedisClientType } from "redis";

// TTL Configuration
export const redisConfig = {
  // TTL por tipo de dato
  USER_CACHE_TTL: 3600, // 1 hora - usuarios cambian poco
  TWEET_CACHE_TTL: 1800, // 30 min - tweets cambian más
  TIMELINE_CACHE_TTL: 300, // 5 min - timelines cambian frecuentemente
  TRENDING_CACHE_TTL: 600, // 10 min - trending actualizado periódicamente
  FOLLOW_CACHE_TTL: 1800, // 30 min - relaciones cambian poco
  LIKE_STATE_TTL: 3600, // 1 hora - estados de like/retweet
};

// Cache key patterns
export const cachePatterns = {
  USER: (userId: string) => `user:${userId}`,
  USER_USERNAME: (username: string) => `user:username:${username}`,
  USER_STATS: (userId: string) => `user:stats:${userId}`,
  USER_SUGGESTIONS: (userId: string) => `user:suggestions:${userId}`,
  USER_LIKES: (userId: string) => `user:likes:${userId}`,
  USER_RETWEETS: (userId: string) => `user:retweets:${userId}`,

  TWEET: (tweetId: string) => `tweet:${tweetId}`,
  TWEET_LIKES_COUNT: (tweetId: string) => `tweet:likes:count:${tweetId}`,
  TWEET_RETWEETS_COUNT: (tweetId: string) => `tweet:retweets:count:${tweetId}`,
  TWEETS_BY_USER: (userId: string) => `tweets:user:${userId}`,

  TIMELINE: (userId: string) => `timeline:${userId}`,
  TIMELINE_PUBLIC: "timeline:public",
  TRENDING_HASHTAGS: "trending:hashtags",
  TRENDING_TWEETS: "trending:tweets",

  FOLLOW_RELATIONSHIP: (followerId: string, followingId: string) =>
    `follow:${followerId}:${followingId}`,
  FOLLOW_STATS: (userId: string) => `follow:stats:${userId}`,
  FOLLOWERS: (userId: string) => `followers:${userId}`,
  FOLLOWING: (userId: string) => `following:${userId}`,

  LIKE_STATE: (userId: string, tweetId: string) => `like:${userId}:${tweetId}`,
  RETWEET_STATE: (userId: string, tweetId: string) =>
    `retweet:${userId}:${tweetId}`,
  MOST_LIKED_TWEETS: "most:liked:tweets",
  MOST_RETWEETED_TWEETS: "most:retweeted:tweets",
};

// Environment variables interface
interface RedisEnvVars {
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
}

// Rate limit result interface
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  current?: number;
}

// Sorted set member interface
interface SortedSetMember {
  score: number;
  value: string;
}

class RedisConfig {
  private client: RedisClientType | null = null;
  private _isConnected: boolean = false;

  constructor() {
    this.client = null;
    this._isConnected = false;
  }

  /**
   * Get connection status
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to Redis server
   */
  public async connect(): Promise<boolean> {
    try {
      // Redis client configuration
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          connectTimeout: 10000,
        },
        password: process.env.REDIS_PASSWORD,
        database: 0,
      });

      // Event listeners
      this.client.on("connect", () => {
        console.log("🔗 Redis Client: Connecting...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis Client: Ready!");
        this._isConnected = true;
      });

      this.client.on("error", (err: Error) => {
        console.error("❌ Redis Client Error:", err);
        this._isConnected = false;
      });

      this.client.on("end", () => {
        console.log("🔌 Redis Client: Connection ended");
        this._isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis Client: Reconnecting...");
      });

      // Connect to Redis server
      await this.client.connect();

      // Verify connection with ping
      await this.client.ping();

      console.log("🚀 Redis Successfully Connected!");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Redis Connection Failed:", errorMessage);
      this._isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis server
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client && this._isConnected) {
        await this.client.quit();
        console.log("✅ Redis connection closed gracefully");
      }
    } catch (error) {
      console.error("❌ Error closing Redis connection:", error);
    }
  }

  /**
   * Get Redis client instance
   */
  public getClient(): RedisClientType {
    if (!this._isConnected || !this.client) {
      throw new Error("Redis client is not connected");
    }
    return this.client;
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this._isConnected;
  }

  // Convenience methods for common operations

  /**
   * Get value from Redis with JSON parsing
   */
  public async get<T = any>(key: string): Promise<T | null> {
    if (!this._isConnected || !this.client) return null;
    try {
      const result = await this.client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  /**
   * Set value in Redis with JSON serialization
   */
  public async set(
    key: string,
    value: any,
    expireInSeconds: number = 3600
  ): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      const serialized = JSON.stringify(value);
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error("Redis SET error:", error);
      return false;
    }
  }

  /**
   * Delete key from Redis (single key)
   */
  public async delSingle(key: string): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("Redis DEL error:", error);
      return false;
    }
  }

  /**
   * Delete multiple keys from Redis
   */
  public async del(keys: string | string[]): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      if (typeof keys === "string") {
        await this.client.del(keys);
      } else {
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }
      return true;
    } catch (error) {
      console.error("Redis DEL multiple error:", error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  public async deleteByPattern(pattern: string): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error("Redis DELETE BY PATTERN error:", error);
      return false;
    }
  }

  /**
   * Check if key exists in Redis
   */
  public async exists(key: string): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis EXISTS error:", error);
      return false;
    }
  }

  // Twitter-specific operations

  /**
   * Cache user timeline
   */
  public async cacheTimeline(
    userId: string,
    tweets: any[],
    expireInSeconds: number = 600
  ): Promise<boolean> {
    const key = `timeline:${userId}`;
    return this.set(key, tweets, expireInSeconds);
  }

  /**
   * Get cached user timeline
   */
  public async getTimeline(userId: string): Promise<any[] | null> {
    const key = `timeline:${userId}`;
    return this.get(key);
  }

  /**
   * Increment counter with optional expiration
   */
  public async incrementCounter(
    key: string,
    expireInSeconds?: number
  ): Promise<number> {
    if (!this._isConnected || !this.client) return 0;
    try {
      const count = await this.client.incr(key);
      if (expireInSeconds && count === 1) {
        await this.client.expire(key, expireInSeconds);
      }
      return count;
    } catch (error) {
      console.error("Redis INCR error:", error);
      return 0;
    }
  }

  /**
   * Add member to sorted set
   */
  public async addToSortedSet(
    key: string,
    score: number,
    member: string
  ): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      await this.client.zAdd(key, { score, value: member });
      return true;
    } catch (error) {
      console.error("Redis ZADD error:", error);
      return false;
    }
  }

  /**
   * Get top members from sorted set
   */
  public async getTopFromSortedSet(
    key: string,
    count: number = 10
  ): Promise<string[]> {
    if (!this._isConnected || !this.client) return [];
    try {
      const result = await this.client.zRange(key, 0, count - 1, { REV: true });
      return result;
    } catch (error) {
      console.error("Redis ZRANGE error:", error);
      return [];
    }
  }

  /**
   * Rate limiting implementation
   */
  public async checkRateLimit(
    key: string,
    maxRequests: number,
    windowInSeconds: number
  ): Promise<RateLimitResult> {
    if (!this._isConnected) {
      return { allowed: true, remaining: maxRequests };
    }

    try {
      const current = await this.incrementCounter(key, windowInSeconds);
      const remaining = Math.max(0, maxRequests - current);
      const allowed = current <= maxRequests;

      return { allowed, remaining, current };
    } catch (error) {
      console.error("Redis rate limit error:", error);
      return { allowed: true, remaining: maxRequests };
    }
  }

  /**
   * Get TTL for a key
   */
  public async getTTL(key: string): Promise<number> {
    if (!this._isConnected || !this.client) return -1;
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error("Redis TTL error:", error);
      return -1;
    }
  }

  /**
   * Set expiration for a key
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      const result = await this.client.expire(key, seconds);
      return Boolean(result);
    } catch (error) {
      console.error("Redis EXPIRE error:", error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  public async mGet<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this._isConnected || !this.client) return [];
    try {
      const results = await this.client.mGet(keys);
      return results.map((result) => (result ? JSON.parse(result) : null));
    } catch (error) {
      console.error("Redis MGET error:", error);
      return [];
    }
  }

  /**
   * Set multiple key-value pairs
   */
  public async mSet(keyValuePairs: Record<string, any>): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    try {
      const serializedPairs: Record<string, string> = {};
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs[key] = JSON.stringify(value);
      }
      await this.client.mSet(serializedPairs);
      return true;
    } catch (error) {
      console.error("Redis MSET error:", error);
      return false;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    if (!this._isConnected || !this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error("Redis KEYS error:", error);
      return [];
    }
  }

  /**
   * Get time to live for a key
   */
  public async ttl(key: string): Promise<number> {
    if (!this._isConnected || !this.client) return -1;
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error("Redis TTL error:", error);
      return -1;
    }
  }
}

// Export singleton instance
export default new RedisConfig();
