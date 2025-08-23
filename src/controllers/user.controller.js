import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import {
  deleteFromImageKit,
  uploadToImageKit,
} from "../services/imagekitService.js";
import mongoose from "mongoose";
import Transaction from "../models/transaction.model.js";
export const updateUserPrfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = req.body;

  const profileImageLocal = req.file;

  const user = await User.findById(req.user._id).select("fileId").lean();
  if (!user) {
    throw new apiError(404, "User not found");
  }

  const oldImageFileId = user.fileId;

  let updateData = { ...fieldsToUpdate };

  if (profileImageLocal) {
    const profileImage = await uploadToImageKit(
      profileImageLocal,
      "profile-pictures"
    );

    if (!profileImage || !profileImage.url) {
      throw new apiError(
        500,
        "Error while uploading profile picture, please try again"
      );
    }

    updateData.avatar = profileImage.url;
    updateData.fileId = profileImage.fileId;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updateData,
    },
    { new: true }
  )
    .select("-password -refreshToken")
    .lean();

  if (!updatedUser) {
    throw new apiError(500, "Something went wrong while updating the profile");
  }

  if (profileImageLocal && oldImageFileId) {
    await deleteFromImageKit(oldImageFileId);
  }

  return apiResponse(res, 200, updatedUser, "Profile updated successfully");
});

export const getMyTransactions = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new apiError(400, "Invalid User, login again");
  }

  // Extract query parameters for pagination and filtering
  const { page = 1, limit = 10, status, type } = req.query;

  const query = {
    user: user._id, // Filter transactions for the logged-in user
  };

  if (status) {
    query.status = status;
  }
  if (type) {
    query.type = type;
  }

  // Convert page and limit to numbers
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Calculate the number of documents to skip
  const skip = (pageNumber - 1) * limitNumber;

  // Fetch transactions with pagination and query filters
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limitNumber);

  // Get total count for pagination info
  const totalTransactions = await Transaction.countDocuments(query);
  const totalPages = Math.ceil(totalTransactions / limitNumber);

  return apiResponse(
    res,
    200,
    {
      transactions,
      pagination: {
        total: totalTransactions,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    },
    "Transactions fetched successfully"
  );
  // Send the response
});
