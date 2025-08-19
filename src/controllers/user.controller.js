import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import {
  deleteFromImageKit,
  uploadToImageKit,
} from "../services/imagekitService.js";

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
