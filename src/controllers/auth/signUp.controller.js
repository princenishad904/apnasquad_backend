import User from "../../models/user.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { apiError } from "../../utils/apiError.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { generateOTP } from "../../lib/generateOTP.js";
import { redisClient } from "../../lib/redis.js";
import { sendEmail } from "../../helper/sendEmails.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password) => {
  return password.length >= 8;
};

export const signUp = asyncHandler(async (req, res) => {
  const { name, email, referralCode, password } = req.body;

  if (!name || !name.trim()) {
    throw new apiError(400, "Name is required and cannot be empty");
  }

  if (!email || !email.trim()) {
    throw new apiError(400, "Email is required and cannot be empty");
  }

  if (!isValidEmail(email)) {
    throw new apiError(400, "Please provide a valid email address");
  }

  if (!password) {
    throw new apiError(400, "Password is required");
  }

  if (!isStrongPassword(password)) {
    throw new apiError(400, "Password must be at least 8 characters long");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email }).select(
    "email referralCode"
  );
  if (existingUser) {
    throw new apiError(
      409,
      "Email already exists. Please use a different email or login."
    );
  }

  let referredBy = null;
  let bonus = 0;

  if (referralCode) {
    const referringUser = await User.findOne({ referralCode }).select(
      "email name referralCode avatar _id"
    );

    if (!referringUser) {
      throw new apiError(400, "Invalid referral code");
    }

    if (referralCode === referringUser.referralCode) {
      referredBy = referringUser._id;
      bonus = 100;
    }
  }

  const otp = generateOTP(6);
  const otpExpiry = Date.now() + 600000; // 10 minutes expiry

  const newUser = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    referredBy,
    bonus,
    otp,
    otpExpiry,
  };

  await redisClient.set(
    `otp:${email}`,
    JSON.stringify(newUser),
    "EX",
    600 // 10 minutes in seconds
  );

  try {
    await sendEmail(
      email,
      "Verify OTP to Sign up",
      { name: name.trim(), otp },
      "signUpOtp"
    );
  } catch (emailError) {
    await redisClient.del(`otp:${email}`);
    throw new apiError(500, "Failed to send OTP. Please try again.");
  }

  return apiResponse(
    res,
    200,
    { email: email.toLowerCase().trim() },
    "OTP has been sent to your email. Please verify within 10 minutes."
  );
});

export const verifyAndSignUp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !email.trim()) {
    throw new apiError(400, "Email is required");
  }

  if (!otp || !otp.trim()) {
    throw new apiError(400, "OTP is required");
  }

  // Check if OTP exists in Redis
  let userData = await redisClient.get(`otp:${email}`);
  if (!userData) {
    throw new apiError(
      400,
      "OTP expired or invalid. Please request a new OTP."
    );
  }

  userData = JSON.parse(userData);

  if (userData.otp !== otp.trim()) {
    throw new apiError(400, "Invalid OTP. Please enter the correct OTP.");
  }

  if (userData.otpExpiry && Date.now() > userData.otpExpiry) {
    await redisClient.del(`otp:${email}`);
    throw new apiError(400, "OTP has expired. Please request a new OTP.");
  }

  // Create user in database
  try {
    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password, // Password hashing should be handled in the User model
      referredBy: userData.referredBy,
    });

    // Clean up Redis
    await redisClient.del(`otp:${email}`);

    if (newUser) {
      if (
        userData.referredBy &&
        mongoose.Types.ObjectId.isValid(userData.referredBy)
      ) {
        await User.findByIdAndUpdate(
          userData.referredBy, // object pass karne ki zarurat nahi, sirf id pass karo
          { $set: { bonus: userData.bonus } }
        );
      }
    }

    // Omit sensitive data from response
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      referralCode: newUser.referralCode,
      createdAt: newUser.createdAt,
    };

    return apiResponse(res, 201, userResponse, "Account created successfully!");
  } catch (dbError) {
    throw new apiError(500, "Failed to create account. Please try again.");
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    throw new apiError(400, "Email is required");
  }
  if (!isValidEmail(email)) {
    throw new apiError(400, "Please provide a valid email address");
  }
  if (!password) {
    throw new apiError(400, "Password is required");
  }

  // Find the user by email
  // .select("+password") is important agar aapne schema mein password ko select: false kiya hai
  const user = await User.findOne({ email });

  if (!user) {
    throw new apiError(404, "Invalid Email or Password");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new apiError(401, "Invalid Email or Password");
  }

  const { accessToken, refreshToken } =
    await user.generateAccessAndRefreshTokens();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // short expiry for access token
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

  return apiResponse(
    res,
    200,
    {
      user: loggedInUser,
    },
    "login successfull"
  );
});

export const getLoggedInUser = asyncHandler(async (req, res) => {
  const user = req.user;
  return apiResponse(res, 200, user, "Fetched logged in user");
});

export const logout = asyncHandler(async (req, res) => {
  const user = User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: "" } },
    {
      new: true,
    }
  );

  // Step 2: Clear cookies from the browser
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options);

  return apiResponse(res, 200, {}, "User logged out successfully");
});
