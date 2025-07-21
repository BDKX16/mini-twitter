/**
 * Tweet Model - TypeScript version
 * MongoDB schema for tweets in the Twitter Clone API
 */

import mongoose, { Model, Schema } from "mongoose";
import {
  ITweet,
  ITweetDocument,
  ITweetLike,
  ITweetRetweet,
  MongooseObjectId,
} from "../types/models";

// Define the tweet schema
const tweetSchema = new Schema<ITweetDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [280, "Tweet content cannot exceed 280 characters"],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    retweetsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    hashtags: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        type: String,
        required: false,
        trim: true,
      },
    ],
    parentTweetId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    versionKey: false, // Disable __v field
    // Configuration for sharding
    shardKey: { author: 1, createdAt: 1 },
    toJSON: {
      transform: function (doc, ret) {
        // Transform _id to id
        ret.id = ret._id;
        delete ret._id;

        // The counts are already in the document
        // No need to calculate from arrays
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        // The counts are already in the document
        return ret;
      },
    },
  }
);

// Composite indexes for frequent queries
tweetSchema.index({ author: 1, createdAt: -1 });
tweetSchema.index({ createdAt: -1 });
tweetSchema.index({ isDeleted: 1, createdAt: -1 });
tweetSchema.index({ mentions: 1 });

// Text index for search functionality
tweetSchema.index({ content: "text" });

// Instance methods - these will be removed since we don't use arrays anymore
// Like/retweet status will be checked via separate queries to Like/Retweet collections
tweetSchema.methods.getLikesCount = function (): number {
  return this.likesCount || 0;
};

tweetSchema.methods.getRetweetsCount = function (): number {
  return this.retweetsCount || 0;
};

tweetSchema.methods.getRepliesCount = function (): number {
  return this.repliesCount || 0;
};

tweetSchema.methods.incrementLikes = function (): void {
  this.likesCount = (this.likesCount || 0) + 1;
};

tweetSchema.methods.decrementLikes = function (): void {
  this.likesCount = Math.max((this.likesCount || 0) - 1, 0);
};

tweetSchema.methods.incrementRetweets = function (): void {
  this.retweetsCount = (this.retweetsCount || 0) + 1;
};

tweetSchema.methods.decrementRetweets = function (): void {
  this.retweetsCount = Math.max((this.retweetsCount || 0) - 1, 0);
};

tweetSchema.methods.incrementReplies = function (): void {
  this.repliesCount = (this.repliesCount || 0) + 1;
};

tweetSchema.methods.decrementReplies = function (): void {
  this.repliesCount = Math.max((this.repliesCount || 0) - 1, 0);
};

tweetSchema.methods.softDelete = function (): void {
  this.isDeleted = true;
};

tweetSchema.methods.restore = function (): void {
  this.isDeleted = false;
};

// Static methods
tweetSchema.statics.findByAuthor = function (authorId: MongooseObjectId) {
  return this.find({ author: authorId, isDeleted: false }).sort({
    createdAt: -1,
  });
};

tweetSchema.statics.findRecent = function (limit: number = 20) {
  return this.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("author", "name firstName lastName");
};

tweetSchema.statics.findByMention = function (userId: MongooseObjectId) {
  return this.find({
    mentions: userId,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

tweetSchema.statics.searchByContent = function (searchTerm: string) {
  return this.find({
    $text: { $search: searchTerm },
    isDeleted: false,
  }).sort({ score: { $meta: "textScore" } });
};

tweetSchema.statics.getTrending = function (hours: number = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: cutoffDate },
        isDeleted: false,
      },
    },
    {
      $addFields: {
        totalEngagement: {
          $add: [
            { $ifNull: ["$likesCount", 0] },
            { $ifNull: ["$retweetsCount", 0] },
            { $ifNull: ["$repliesCount", 0] },
          ],
        },
      },
    },
    {
      $sort: { totalEngagement: -1 },
    },
    {
      $limit: 20,
    },
  ]);
};

// Pre-save middleware
tweetSchema.pre("save", function (next) {
  // Extract mentions automatically from content
  if (this.isModified("content")) {
    const mentionMatches = (this as any).content.match(/@(\w+)/g);
    if (mentionMatches) {
      // Note: In a real app, you'd want to resolve usernames to ObjectIds
      // For now, we'll just clear the mentions array
      (this as any).mentions = [];
    }
  }
  next();
});

// Pre-update middleware
tweetSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  const update = this.getUpdate() as any;
  if (update.content) {
    // Extract mentions if content is being updated
    const mentionMatches = update.content.match(/@(\w+)/g);
    if (mentionMatches) {
      update.mentions = [];
    }
  }
  next();
});

// Define the Tweet model interface with static methods
interface ITweetModel extends Model<ITweetDocument> {
  findByAuthor(authorId: MongooseObjectId): Promise<ITweetDocument[]>;
  findRecent(limit?: number): Promise<ITweetDocument[]>;
  findByMention(userId: MongooseObjectId): Promise<ITweetDocument[]>;
  searchByContent(searchTerm: string): Promise<ITweetDocument[]>;
  getTrending(hours?: number): Promise<any[]>;
}

// Create and export the Tweet model
const Tweet = mongoose.model<ITweetDocument, ITweetModel>("Tweet", tweetSchema);

export default Tweet;
export { ITweet, ITweetDocument, ITweetModel };
