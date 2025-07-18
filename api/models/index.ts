/**
 * Models Index - TypeScript version
 * Central export point for all MongoDB models
 */

// Import all models
import User from "./user";
import Tweet from "./tweet";
import Like from "./like";
import Follow from "./follow";
import Retweet from "./retweet";

// Import all types
export * from "../types/models";

// Export models
export { User, Tweet, Like, Follow, Retweet };

// Export model types
export type {
  IUserModel,
  ITweetModel,
  ILikeModel,
  IFollowModel,
  IRetweetModel,
} from "../types/models";

// Default export for convenience
export default {
  User,
  Tweet,
  Like,
  Follow,
  Retweet,
};
