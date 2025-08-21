import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [55, "Name can't be more than 55 characters"],
      minlength: [2, "Name must be at least 2 characters long"],
    },
    bgmiId: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: [true, "Email is required"],
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      default: "",
    },
    upiId: {
      type: String,
      default: "",
    },
    upiName: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager"],
      default: "user",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: [6, "Password must be at least 6 characters"],
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    teamName: {
      type: String,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    referralCode: {
      type: String,
      unique: true,
      index: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    avatar: {
      type: String,
      default: "",
    },
    fileId: { type: String, default: "" },

    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  }
  next();
});

userSchema.methods.generateAccessAndRefreshTokens = async function () {
  const accessToken = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
    },
    config.ACCESS_TOKEN_SECRET,
    {
      expiresIn: config.ACCESS_TOKEN_EXPIRY,
    }
  );

  const refreshToken = jwt.sign(
    { _id: this._id },
    config.REFRESH_TOKEN_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRY }
  );

  this.refreshToken = refreshToken;
  await this.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const User = mongoose.model("User", userSchema);
export default User;
