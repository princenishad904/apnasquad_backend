import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { config } from "../config/index.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // 1. Token ko cookies ya header se nikalte hain
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); // BUG FIX: [1] hata diya gaya

    if (!token) {
      throw new apiError(401, "Unauthorized request. Token not found.");
    }

    // 2. Token ko verify karte hain
    const decodedToken = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id)
      .select("-password -refreshToken")
      .lean();

    if (!user) {
      // Agar user database mein nahi milta hai
      throw new apiError(401, "Invalid Access Token. User not found.");
    }

    // 4. User object ko request mein attach kar dete hain taaki aage ke controllers use kar sakein
    req.user = user;
    next();
  } catch (error) {
    // Custom error handling
    if (error.name === "TokenExpiredError") {
      throw new apiError(401, "Access Token has expired. Please login again.");
    }
    if (error.name === "JsonWebTokenError") {
      throw new apiError(401, "Invalid Access Token. Signature is invalid.");
    }

    // Baaki sabhi errors ke liye
    throw new apiError(401, error?.message || "Invalid access token.");
  }
});
