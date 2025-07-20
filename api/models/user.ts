/**
 * User Model - TypeScript version
 * MongoDB schema for user accounts in the Twitter Clone API
 */

import mongoose, { Model, Schema } from "mongoose";
import { IUser, IUserDocument, MongooseObjectId } from "../types/models";

// Import mongoose-unique-validator as any to avoid type issues
const uniqueValidator = require("mongoose-unique-validator");

// Define the user schema
const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Username cannot exceed 100 characters"],
    },
    password: {
      type: String,
      required: false,
      default: "",
    },
    confirmed: {
      type: Boolean,
      required: [true, "Confirmation status is required"],
      default: false,
    },
    nullDate: {
      type: Date,
      required: false,
      default: null,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    firstName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number"],
    },
    address: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
    },
    resetPasswordToken: {
      type: String,
      required: false,
      select: false, // Don't include in queries by default
    },
    resetPasswordExpires: {
      type: Date,
      required: false,
      select: false, // Don't include in queries by default
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    versionKey: false, // Disable __v field
    toJSON: {
      transform: function (doc, ret) {
        // Transform _id to id and remove sensitive fields
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

// Add unique validator plugin
userSchema.plugin(uniqueValidator, {
  message: "Error, {PATH} already exists.",
});

// Add indexes for better performance
userSchema.index({ username: 1 });
userSchema.index({ confirmed: 1 });
userSchema.index({ createdAt: -1 });

// Instance methods
userSchema.methods.getPublicProfile = function (): Partial<IUser> {
  return {
    username: this.username,
    confirmed: this.confirmed,
    createdAt: this.createdAt,
    firstName: this.firstName,
    lastName: this.lastName,
  };
};

userSchema.methods.getFullName = function (): string {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
};

userSchema.methods.isAccountConfirmed = function (): boolean {
  return this.confirmed;
};

// Static methods
userSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username: username });
};

userSchema.statics.findConfirmedUsers = function () {
  return this.find({ confirmed: true });
};

userSchema.statics.findRecentUsers = function (days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return this.find({ createdAt: { $gte: cutoffDate } });
};

// Pre-save middleware
userSchema.pre("save", function (next) {
  // Set default username if not provided
  if (!this.username && this.firstName && this.lastName) {
    this.username = `${this.firstName} ${this.lastName}`;
  }

  next();
});

// Pre-update middleware
userSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  next();
});

// Define the User model interface with static methods
interface IUserModel extends Model<IUserDocument> {
  findByUsername(username: string): Promise<IUserDocument | null>;
  findConfirmedUsers(): Promise<IUserDocument[]>;
  findRecentUsers(days?: number): Promise<IUserDocument[]>;
}

// Create and export the User model
const User = mongoose.model<IUserDocument, IUserModel>("User", userSchema);

export default User;
export { IUser, IUserDocument, IUserModel };
