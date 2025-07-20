/**
 * Like Model - TypeScript version
 * MongoDB schema for likes in the Twitter Clone API
 */

import mongoose, { Model, Schema } from "mongoose";
import { ILike, ILikeDocument, MongooseObjectId } from "../types/models";

// Define the like schema
const likeSchema = new Schema<ILikeDocument>(
  {
    // User who gives the like
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Tweet that receives the like
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      required: [true, "Tweet is required"],
      index: true,
    },

    // Date of the like
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false, // We manually handle createdAt
    versionKey: false, // Disable __v field
    toJSON: {
      transform: function (doc, ret) {
        // Transform _id to id
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Composite indexes for frequent queries
likeSchema.index({ user: 1, tweet: 1 }, { unique: true }); // Prevent duplicate likes
likeSchema.index({ tweet: 1, createdAt: -1 }); // For getting tweet likes
likeSchema.index({ user: 1, createdAt: -1 }); // For getting user likes
likeSchema.index({ createdAt: -1 }); // For recent likes

// Instance methods
likeSchema.methods.isFromUser = function (userId: MongooseObjectId): boolean {
  return this.user.toString() === userId.toString();
};

likeSchema.methods.isForTweet = function (tweetId: MongooseObjectId): boolean {
  return this.tweet.toString() === tweetId.toString();
};

// Static methods
likeSchema.statics.findByUser = function (userId: MongooseObjectId) {
  return this.find({ user: userId }).sort({ createdAt: -1 }).populate("tweet");
};

likeSchema.statics.findByTweet = function (tweetId: MongooseObjectId) {
  return this.find({ tweet: tweetId })
    .sort({ createdAt: -1 })
    .populate("user", "name firstName lastName");
};

likeSchema.statics.findByUserAndTweet = function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  return this.findOne({ user: userId, tweet: tweetId });
};

likeSchema.statics.countByTweet = function (tweetId: MongooseObjectId) {
  return this.countDocuments({ tweet: tweetId });
};

likeSchema.statics.countByUser = function (userId: MongooseObjectId) {
  return this.countDocuments({ user: userId });
};

likeSchema.statics.getRecentLikes = function (limit: number = 20) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name firstName lastName")
    .populate("tweet", "content author createdAt");
};

likeSchema.statics.getUserLikeStats = function (userId: MongooseObjectId) {
  return this.aggregate([
    {
      $match: { user: userId },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
        firstLike: { $min: "$createdAt" },
        lastLike: { $max: "$createdAt" },
      },
    },
  ]);
};

likeSchema.statics.getTweetLikeStats = function (tweetId: MongooseObjectId) {
  return this.aggregate([
    {
      $match: { tweet: tweetId },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
        firstLike: { $min: "$createdAt" },
        lastLike: { $max: "$createdAt" },
      },
    },
  ]);
};

likeSchema.statics.getMostLikedTweets = function (limit: number = 10) {
  return this.aggregate([
    {
      $group: {
        _id: "$tweet",
        likesCount: { $sum: 1 },
        lastLike: { $max: "$createdAt" },
      },
    },
    {
      $sort: { likesCount: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "_id",
        as: "tweet",
      },
    },
    {
      $unwind: "$tweet",
    },
  ]);
};

likeSchema.statics.createLike = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  try {
    const existingLike = await this.findOne({ user: userId, tweet: tweetId });
    if (existingLike) {
      throw new Error("User has already liked this tweet");
    }

    const like = new this({
      user: userId,
      tweet: tweetId,
    });

    return await like.save();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error("User has already liked this tweet");
    }
    throw error;
  }
};

likeSchema.statics.removeLike = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  const result = await this.deleteOne({ user: userId, tweet: tweetId });
  return result.deletedCount > 0;
};

likeSchema.statics.toggleLike = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  const existingLike = await this.findOne({ user: userId, tweet: tweetId });

  if (existingLike) {
    await this.deleteOne({ user: userId, tweet: tweetId });
    return { action: "unliked", like: null };
  } else {
    const like = await this.create({
      user: userId,
      tweet: tweetId,
    });
    return { action: "liked", like };
  }
};

// Pre-save middleware
likeSchema.pre("save", function (next) {
  // Ensure we have a valid date
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});

// Define the Like model interface with static methods
interface ILikeModel extends Model<ILikeDocument> {
  findByUser(userId: MongooseObjectId): Promise<ILikeDocument[]>;
  findByTweet(tweetId: MongooseObjectId): Promise<ILikeDocument[]>;
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<ILikeDocument | null>;
  countByTweet(tweetId: MongooseObjectId): Promise<number>;
  countByUser(userId: MongooseObjectId): Promise<number>;
  getRecentLikes(limit?: number): Promise<ILikeDocument[]>;
  getUserLikeStats(userId: MongooseObjectId): Promise<any[]>;
  getTweetLikeStats(tweetId: MongooseObjectId): Promise<any[]>;
  getMostLikedTweets(limit?: number): Promise<any[]>;
  createLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<ILikeDocument>;
  removeLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;
  toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{ action: string; like: ILikeDocument | null }>;
}

// Create and export the Like model
const Like = mongoose.model<ILikeDocument, ILikeModel>("Like", likeSchema);

export default Like;
export { ILike, ILikeDocument, ILikeModel };
