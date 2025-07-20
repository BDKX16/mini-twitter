/**
 * Follow Model - TypeScript version
 * MongoDB schema for follow relationships in the Twitter Clone API
 */

import mongoose, { Model, Schema } from "mongoose";
import { IFollow, IFollowDocument, MongooseObjectId } from "../types/models";

// Define the follow schema
const followSchema = new Schema<IFollowDocument>(
  {
    // User who follows (follower)
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Follower is required"],
      index: true,
    },

    // User who is followed (following)
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Following is required"],
      index: true,
    },

    // Date when the follow relationship was created
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
followSchema.index({ follower: 1, following: 1 }, { unique: true }); // Prevent duplicate follows
followSchema.index({ following: 1, createdAt: -1 }); // For getting followers
followSchema.index({ follower: 1, createdAt: -1 }); // For getting following
followSchema.index({ createdAt: -1 }); // For recent follows

// Validation to prevent self-following
followSchema.pre("save", function (next) {
  if (this.follower.toString() === this.following.toString()) {
    const error = new Error("Users cannot follow themselves");
    return next(error);
  }
  next();
});

// Instance methods
followSchema.methods.isFollowerOf = function (
  userId: MongooseObjectId
): boolean {
  return this.follower.toString() === userId.toString();
};

followSchema.methods.isFollowingUser = function (
  userId: MongooseObjectId
): boolean {
  return this.following.toString() === userId.toString();
};

// Static methods
followSchema.statics.findFollowers = function (userId: MongooseObjectId) {
  return this.find({ following: userId })
    .sort({ createdAt: -1 })
    .populate("follower", "name firstName lastName");
};

followSchema.statics.findFollowing = function (userId: MongooseObjectId) {
  return this.find({ follower: userId })
    .sort({ createdAt: -1 })
    .populate("following", "name firstName lastName");
};

followSchema.statics.findByFollowerAndFollowing = function (
  followerId: MongooseObjectId,
  followingId: MongooseObjectId
) {
  return this.findOne({ follower: followerId, following: followingId });
};

followSchema.statics.countFollowers = function (userId: MongooseObjectId) {
  return this.countDocuments({ following: userId });
};

followSchema.statics.countFollowing = function (userId: MongooseObjectId) {
  return this.countDocuments({ follower: userId });
};

followSchema.statics.isFollowing = async function (
  followerId: MongooseObjectId,
  followingId: MongooseObjectId
) {
  const follow = await this.findOne({
    follower: followerId,
    following: followingId,
  });
  return !!follow;
};

followSchema.statics.getRecentFollows = function (limit: number = 20) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("follower", "name firstName lastName")
    .populate("following", "name firstName lastName");
};

followSchema.statics.getMutualFollowers = function (
  userId1: MongooseObjectId,
  userId2: MongooseObjectId
) {
  return this.aggregate([
    {
      $match: { following: userId1 },
    },
    {
      $lookup: {
        from: "follows",
        localField: "follower",
        foreignField: "follower",
        as: "user2Follows",
      },
    },
    {
      $match: {
        "user2Follows.following": userId2,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "follower",
        foreignField: "_id",
        as: "mutualFollower",
      },
    },
    {
      $unwind: "$mutualFollower",
    },
    {
      $project: {
        _id: "$mutualFollower._id",
        name: "$mutualFollower.name",
        firstName: "$mutualFollower.firstName",
        lastName: "$mutualFollower.lastName",
      },
    },
  ]);
};

followSchema.statics.getFollowSuggestions = function (
  userId: MongooseObjectId,
  limit: number = 10
) {
  return this.aggregate([
    // Get users that the current user's follows are following
    {
      $match: { follower: userId },
    },
    {
      $lookup: {
        from: "follows",
        localField: "following",
        foreignField: "follower",
        as: "suggestions",
      },
    },
    {
      $unwind: "$suggestions",
    },
    {
      $match: {
        "suggestions.following": { $ne: userId },
      },
    },
    {
      $group: {
        _id: "$suggestions.following",
        mutualFollows: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "following",
        as: "alreadyFollowing",
      },
    },
    {
      $match: {
        "alreadyFollowing.follower": { $ne: userId },
      },
    },
    {
      $sort: { mutualFollows: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
  ]);
};

followSchema.statics.createFollow = async function (
  followerId: MongooseObjectId,
  followingId: MongooseObjectId
) {
  try {
    // Check if already following
    const existingFollow = await this.findOne({
      follower: followerId,
      following: followingId,
    });
    if (existingFollow) {
      throw new Error("Already following this user");
    }

    // Prevent self-following
    if (followerId.toString() === followingId.toString()) {
      throw new Error("Users cannot follow themselves");
    }

    const follow = new this({
      follower: followerId,
      following: followingId,
    });

    return await follow.save();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error("Already following this user");
    }
    throw error;
  }
};

followSchema.statics.removeFollow = async function (
  followerId: MongooseObjectId,
  followingId: MongooseObjectId
) {
  const result = await this.deleteOne({
    follower: followerId,
    following: followingId,
  });
  return result.deletedCount > 0;
};

followSchema.statics.toggleFollow = async function (
  followerId: MongooseObjectId,
  followingId: MongooseObjectId
) {
  const existingFollow = await this.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existingFollow) {
    await this.deleteOne({ follower: followerId, following: followingId });
    return { action: "unfollowed", follow: null };
  } else {
    const follow = await this.create({
      follower: followerId,
      following: followingId,
    });
    return { action: "followed", follow };
  }
};

followSchema.statics.bulkFollow = async function (
  followerId: MongooseObjectId,
  followingIds: MongooseObjectId[]
) {
  const follows = followingIds
    .filter((id) => id.toString() !== followerId.toString()) // Prevent self-following
    .map((followingId) => ({
      follower: followerId,
      following: followingId,
      createdAt: new Date(),
    }));

  try {
    const result = await this.insertMany(follows, { ordered: false });
    return result;
  } catch (error: any) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      const successfulInserts = error.insertedDocs || [];
      return successfulInserts;
    }
    throw error;
  }
};

// Pre-save middleware
followSchema.pre("save", function (next) {
  // Ensure we have a valid date
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});

// Define the Follow model interface with static methods
interface IFollowModel extends Model<IFollowDocument> {
  findFollowers(userId: MongooseObjectId): Promise<IFollowDocument[]>;
  findFollowing(userId: MongooseObjectId): Promise<IFollowDocument[]>;
  findByFollowerAndFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<IFollowDocument | null>;
  countFollowers(userId: MongooseObjectId): Promise<number>;
  countFollowing(userId: MongooseObjectId): Promise<number>;
  isFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean>;
  getRecentFollows(limit?: number): Promise<IFollowDocument[]>;
  getMutualFollowers(
    userId1: MongooseObjectId,
    userId2: MongooseObjectId
  ): Promise<any[]>;
  getFollowSuggestions(
    userId: MongooseObjectId,
    limit?: number
  ): Promise<any[]>;
  createFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<IFollowDocument>;
  removeFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean>;
  toggleFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<{ action: string; follow: IFollowDocument | null }>;
  bulkFollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<IFollowDocument[]>;
}

// Create and export the Follow model
const Follow = mongoose.model<IFollowDocument, IFollowModel>(
  "Follow",
  followSchema
);

export default Follow;
export { IFollow, IFollowDocument, IFollowModel };
