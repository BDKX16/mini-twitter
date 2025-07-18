/**
 * Retweet Model - TypeScript version
 * MongoDB schema for retweets in the Twitter Clone API
 */

import mongoose, { Model, Schema } from "mongoose";
import { IRetweet, IRetweetDocument, MongooseObjectId } from "../types/models";

// Define the retweet schema
const retweetSchema = new Schema<IRetweetDocument>(
  {
    // User who makes the retweet
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Original tweet being retweeted
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
      required: [true, "Tweet is required"],
      index: true,
    },

    // Optional comment for the retweet (quote tweet)
    comment: {
      type: String,
      maxlength: [280, "Comment cannot exceed 280 characters"],
      trim: true,
    },

    // Date when the retweet was created
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

        // Add computed fields
        ret.isQuote = Boolean(ret.comment && ret.comment.trim().length > 0);
        ret.retweetType = ret.isQuote ? "quote" : "simple";

        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        ret.isQuote = Boolean(ret.comment && ret.comment.trim().length > 0);
        ret.retweetType = ret.isQuote ? "quote" : "simple";
        return ret;
      },
    },
  }
);

// Composite indexes for frequent queries
retweetSchema.index({ user: 1, tweet: 1 }, { unique: true }); // Prevent duplicate retweets
retweetSchema.index({ tweet: 1, createdAt: -1 }); // For getting tweet retweets
retweetSchema.index({ user: 1, createdAt: -1 }); // For getting user retweets
retweetSchema.index({ createdAt: -1 }); // For recent retweets

// Instance methods
retweetSchema.methods.isFromUser = function (
  userId: MongooseObjectId
): boolean {
  return this.user.toString() === userId.toString();
};

retweetSchema.methods.isForTweet = function (
  tweetId: MongooseObjectId
): boolean {
  return this.tweet.toString() === tweetId.toString();
};

retweetSchema.methods.isQuoteRetweet = function (): boolean {
  return Boolean(this.comment && this.comment.trim().length > 0);
};

retweetSchema.methods.getRetweetType = function (): "simple" | "quote" {
  return this.isQuoteRetweet() ? "quote" : "simple";
};

// Static methods
retweetSchema.statics.findByUser = function (userId: MongooseObjectId) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("tweet")
    .populate("user", "name email firstName lastName");
};

retweetSchema.statics.findByTweet = function (tweetId: MongooseObjectId) {
  return this.find({ tweet: tweetId })
    .sort({ createdAt: -1 })
    .populate("user", "name email firstName lastName");
};

retweetSchema.statics.findByUserAndTweet = function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  return this.findOne({ user: userId, tweet: tweetId });
};

retweetSchema.statics.findQuoteRetweets = function (
  tweetId?: MongooseObjectId
) {
  const query: any = { comment: { $exists: true, $ne: "" } };
  if (tweetId) {
    query.tweet = tweetId;
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate("user", "name email firstName lastName")
    .populate("tweet");
};

retweetSchema.statics.findSimpleRetweets = function (
  tweetId?: MongooseObjectId
) {
  const query: any = {
    $or: [{ comment: { $exists: false } }, { comment: "" }],
  };
  if (tweetId) {
    query.tweet = tweetId;
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate("user", "name email firstName lastName")
    .populate("tweet");
};

retweetSchema.statics.countByTweet = function (tweetId: MongooseObjectId) {
  return this.countDocuments({ tweet: tweetId });
};

retweetSchema.statics.countByUser = function (userId: MongooseObjectId) {
  return this.countDocuments({ user: userId });
};

retweetSchema.statics.countQuoteRetweets = function (
  tweetId?: MongooseObjectId
) {
  const query: any = { comment: { $exists: true, $ne: "" } };
  if (tweetId) {
    query.tweet = tweetId;
  }
  return this.countDocuments(query);
};

retweetSchema.statics.countSimpleRetweets = function (
  tweetId?: MongooseObjectId
) {
  const query: any = {
    $or: [{ comment: { $exists: false } }, { comment: "" }],
  };
  if (tweetId) {
    query.tweet = tweetId;
  }
  return this.countDocuments(query);
};

retweetSchema.statics.getRecentRetweets = function (limit: number = 20) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name email firstName lastName")
    .populate("tweet", "content author createdAt");
};

retweetSchema.statics.getMostRetweetedTweets = function (limit: number = 10) {
  return this.aggregate([
    {
      $group: {
        _id: "$tweet",
        retweetsCount: { $sum: 1 },
        quoteRetweetsCount: {
          $sum: {
            $cond: [
              {
                $and: [{ $ne: ["$comment", ""] }, { $ne: ["$comment", null] }],
              },
              1,
              0,
            ],
          },
        },
        simpleRetweetsCount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$comment", ""] }, { $eq: ["$comment", null] }] },
              1,
              0,
            ],
          },
        },
        lastRetweet: { $max: "$createdAt" },
      },
    },
    {
      $sort: { retweetsCount: -1 },
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

retweetSchema.statics.getUserRetweetStats = function (
  userId: MongooseObjectId
) {
  return this.aggregate([
    {
      $match: { user: userId },
    },
    {
      $group: {
        _id: null,
        totalRetweets: { $sum: 1 },
        quoteRetweets: {
          $sum: {
            $cond: [
              {
                $and: [{ $ne: ["$comment", ""] }, { $ne: ["$comment", null] }],
              },
              1,
              0,
            ],
          },
        },
        simpleRetweets: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$comment", ""] }, { $eq: ["$comment", null] }] },
              1,
              0,
            ],
          },
        },
        firstRetweet: { $min: "$createdAt" },
        lastRetweet: { $max: "$createdAt" },
      },
    },
  ]);
};

retweetSchema.statics.createRetweet = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId,
  comment?: string
) {
  try {
    // Check if already retweeted
    const existingRetweet = await this.findOne({
      user: userId,
      tweet: tweetId,
    });
    if (existingRetweet) {
      throw new Error("User has already retweeted this tweet");
    }

    const retweet = new this({
      user: userId,
      tweet: tweetId,
      comment: comment || "",
    });

    return await retweet.save();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error("User has already retweeted this tweet");
    }
    throw error;
  }
};

retweetSchema.statics.removeRetweet = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId
) {
  const result = await this.deleteOne({ user: userId, tweet: tweetId });
  return result.deletedCount > 0;
};

retweetSchema.statics.toggleRetweet = async function (
  userId: MongooseObjectId,
  tweetId: MongooseObjectId,
  comment?: string
) {
  const existingRetweet = await this.findOne({ user: userId, tweet: tweetId });

  if (existingRetweet) {
    await this.deleteOne({ user: userId, tweet: tweetId });
    return { action: "unretweeted", retweet: null };
  } else {
    const retweet = await this.create({
      user: userId,
      tweet: tweetId,
      comment: comment || "",
    });
    return { action: "retweeted", retweet };
  }
};

retweetSchema.statics.getRetweetTimeline = function (
  userId: MongooseObjectId,
  limit: number = 20
) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("tweet")
    .populate("user", "name email firstName lastName");
};

// Pre-save middleware
retweetSchema.pre("save", function (next) {
  // Ensure we have a valid date
  if (!this.createdAt) {
    this.createdAt = new Date();
  }

  // Trim comment if provided
  if (this.comment) {
    this.comment = this.comment.trim();
  }

  next();
});

// Define the Retweet model interface with static methods
interface IRetweetModel extends Model<IRetweetDocument> {
  findByUser(userId: MongooseObjectId): Promise<IRetweetDocument[]>;
  findByTweet(tweetId: MongooseObjectId): Promise<IRetweetDocument[]>;
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<IRetweetDocument | null>;
  findQuoteRetweets(tweetId?: MongooseObjectId): Promise<IRetweetDocument[]>;
  findSimpleRetweets(tweetId?: MongooseObjectId): Promise<IRetweetDocument[]>;
  countByTweet(tweetId: MongooseObjectId): Promise<number>;
  countByUser(userId: MongooseObjectId): Promise<number>;
  countQuoteRetweets(tweetId?: MongooseObjectId): Promise<number>;
  countSimpleRetweets(tweetId?: MongooseObjectId): Promise<number>;
  getRecentRetweets(limit?: number): Promise<IRetweetDocument[]>;
  getMostRetweetedTweets(limit?: number): Promise<any[]>;
  getUserRetweetStats(userId: MongooseObjectId): Promise<any[]>;
  createRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<IRetweetDocument>;
  removeRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;
  toggleRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<{ action: string; retweet: IRetweetDocument | null }>;
  getRetweetTimeline(
    userId: MongooseObjectId,
    limit?: number
  ): Promise<IRetweetDocument[]>;
}

// Create and export the Retweet model
const Retweet = mongoose.model<IRetweetDocument, IRetweetModel>(
  "Retweet",
  retweetSchema
);

export default Retweet;
export { IRetweet, IRetweetDocument, IRetweetModel };
