/**
 * Repository Interfaces Index
 * Exports all repository interfaces for easy importing
 */

// Base repository interface
export {
  IBaseRepository,
  BaseQueryOptions,
  RepositoryResult,
  PaginatedResult,
} from "./IBaseRepository";

// Domain-specific repository interfaces
export { IUserRepository } from "./IUserRepository";
export { ITweetRepository } from "./ITweetRepository";
export { IFollowRepository } from "./IFollowRepository";
export { ILikeRepository } from "./ILikeRepository";
export { IRetweetRepository } from "./IRetweetRepository";

/**
 * Common repository operations that all repositories should support
 */
export interface IRepositoryOperations {
  // CRUD operations
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;

  // Advanced operations
  search: boolean;
  pagination: boolean;
  aggregation: boolean;
  statistics: boolean;
  bulkOperations: boolean;
}

/**
 * Repository implementation checklist
 * Use this to ensure all required methods are implemented
 */
export const REPOSITORY_METHODS_CHECKLIST = {
  base: [
    "create",
    "createMany",
    "findById",
    "findOne",
    "find",
    "findAll",
    "findWithPagination",
    "updateById",
    "updateOne",
    "updateMany",
    "deleteById",
    "deleteOne",
    "deleteMany",
    "count",
    "exists",
    "aggregate",
  ],
  user: [
    "findByUsername",
    "findConfirmedUsers",
    "findRecentUsers",
    "searchUsers",
    "checkUsernameAvailability",
    "getUserStats",
    "getSuggestedUsers",
    "getPopularUsers",
  ],
  tweet: [
    "findByAuthor",
    "findRecent",
    "findByMention",
    "getHashtagTweets",
    "findReplies",
    "findByThread",
    "searchByContent",
    "getTimelineForUser",
    "getPersonalTimeline",
    "getTrending",
    "getTweetStats",
    "getHashtagTrends",
    "getMostLikedTweets",
    "getMostRetweetedTweets",
    "bulkUpdateCounters",
  ],
  follow: [
    "findFollowers",
    "findFollowing",
    "findByFollowerAndFollowing",
    "isFollowing",
    "countFollowers",
    "countFollowing",
    "getFollowStats",
    "toggleFollow",
    "getMutualFollowers",
    "getFollowSuggestions",
    "getSecondDegreeConnections",
    "bulkFollow",
    "bulkUnfollow",
    "getFollowActivity",
  ],
  like: [
    "findByUser",
    "findByTweet",
    "findByUserAndTweet",
    "hasUserLikedTweet",
    "countByTweet",
    "countByUser",
    "getUserLikeStats",
    "toggleLike",
    "addLike",
    "removeLike",
    "getMostLikedTweets",
    "getNetworkLikes",
    "getUsersWhoLiked",
    "bulkUpdateLikeCounts",
    "getLikeActivity",
  ],
  retweet: [
    "findByUser",
    "findByTweet",
    "findByUserAndTweet",
    "findQuoteRetweets",
    "findSimpleRetweets",
    "hasUserRetweeted",
    "countByTweet",
    "countByUser",
    "countQuoteRetweets",
    "getUserRetweetStats",
    "toggleRetweet",
    "addRetweet",
    "removeRetweet",
    "getMostRetweetedTweets",
    "getNetworkRetweets",
    "getUsersWhoRetweeted",
    "getQuoteRetweetsWithComments",
    "bulkUpdateRetweetCounts",
    "getRetweetActivity",
    "getRetweetChain",
  ],
} as const;
