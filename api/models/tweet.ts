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
    likes: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    retweets: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

        // Add computed fields
        ret.likesCount = ret.likes ? ret.likes.length : 0;
        ret.retweetsCount = ret.retweets ? ret.retweets.length : 0;

        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        ret.likesCount = ret.likes ? ret.likes.length : 0;
        ret.retweetsCount = ret.retweets ? ret.retweets.length : 0;
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

// Instance methods
tweetSchema.methods.isLikedBy = function (userId: MongooseObjectId): boolean {
  return this.likes.some(
    (like: ITweetLike) => like.user.toString() === userId.toString()
  );
};

tweetSchema.methods.isRetweetedBy = function (
  userId: MongooseObjectId
): boolean {
  return this.retweets.some(
    (retweet: ITweetRetweet) => retweet.user.toString() === userId.toString()
  );
};

tweetSchema.methods.addLike = function (userId: MongooseObjectId): void {
  if (!this.isLikedBy(userId)) {
    this.likes.push({
      user: userId,
      createdAt: new Date(),
    });
  }
};

tweetSchema.methods.removeLike = function (userId: MongooseObjectId): void {
  this.likes = this.likes.filter(
    (like: ITweetLike) => like.user.toString() !== userId.toString()
  );
};

tweetSchema.methods.addRetweet = function (userId: MongooseObjectId): void {
  if (!this.isRetweetedBy(userId)) {
    this.retweets.push({
      user: userId,
      createdAt: new Date(),
    });
  }
};

tweetSchema.methods.removeRetweet = function (userId: MongooseObjectId): void {
  this.retweets = this.retweets.filter(
    (retweet: ITweetRetweet) => retweet.user.toString() !== userId.toString()
  );
};

tweetSchema.methods.getLikesCount = function (): number {
  return this.likes.length;
};

tweetSchema.methods.getRetweetsCount = function (): number {
  return this.retweets.length;
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
        likesCount: { $size: "$likes" },
        retweetsCount: { $size: "$retweets" },
        totalEngagement: {
          $add: [{ $size: "$likes" }, { $size: "$retweets" }],
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
