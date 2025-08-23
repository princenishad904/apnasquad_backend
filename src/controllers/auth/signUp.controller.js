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

  const otp = generateOTP(4);
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
  } catch (error) {
    console.log(error);
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
      // domain: ".team04.site", // allow team04.site & www.team04.site both
      maxAge: 30 * 60 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      // domain: ".team04.site", // allow team04.site & www.team04.site both
      maxAge: 60 * 60 * 60 * 1000,
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
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: "" } },
    {
      new: true,
    }
  );

  // Step 2: Clear cookies from the browser
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".team04.site",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options);

  return apiResponse(res, 200, {}, "User logged out successfully");
});

export const sendResetPasswordOtp = asyncHandler(async (req, res) => {
  // 1. Request body se email extract karein.
  const { email } = req.body;

  // 2. Email validation.
  if (!email) {
    throw new apiError(400, "Please enter email");
  }

  const isExist = await User.findOne({ email }).select("email").lean();
  if (!isExist) {
    // Corrected: Status code added, aur better error message.
    throw new apiError(
      404,
      "User not found with this email. Please enter a registered email."
    );
  }

  const otp = generateOTP(4);
  const otpKey = `otp:${email}`;

  // 5. Redis mein OTP store karein 5 minutes (300 seconds) ke liye.
  await redisClient.set(
    otpKey,
    JSON.stringify({
      email,
      otp,
      isVerified: false,
    }),
    "EX", // EX ka matlab hai seconds mein expiration time
    300
  );

  // 6. User ko OTP email karein.
  try {
    await sendEmail(
      isExist.email,
      "Reset your apnasquad password",
      { otp: otp },
      "resetPassword"
    );
  } catch (error) {
    // Agar email bhejte waqt koi error aaye toh
    throw new apiError(500, `Failed to send OTP email: ${error.message}`);
  }

  // 7. Client ko success response bhejein.
  return apiResponse(res, 200, {}, "OTP for password reset sent successfully.");
});

export const verifyResetPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email) {
    throw new apiError(400, "Email is missing. Please try again.");
  }
  if (!otp) {
    throw new apiError(400, "Please enter the OTP.");
  }

  const otpKey = `otp:${email}`;

  // 3. Redis se OTP data fetch karein.
  let userData = await redisClient.get(otpKey);

  // 4. Check karein ki OTP exist karta hai ya expire ho gaya hai.
  if (!userData) {
    throw new apiError(400, "OTP has expired. Please send again.");
  }

  // 5. JSON data ko parse karein.
  userData = JSON.parse(userData);

  // 6. OTP match karein.
  if (otp !== userData.otp) {
    throw new apiError(400, "Invalid OTP. Please check and try again.");
  }

  userData.isVerified = true;

  await redisClient.set(otpKey, JSON.stringify(userData), "EX", 600);

  return apiResponse(
    res,
    200,
    {},
    "OTP verified successfully. You can now reset your password."
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  // 1. Request body se email aur naya password extract karein.
  const { email, password } = req.body;

  // 2. Input validation.
  if (!email) {
    throw new apiError(400, "Please enter email");
  }
  if (!password) {
    throw new apiError(400, "Please enter a new password");
  }

  const otpKey = `otp:${email}`;

  // 3. Redis se OTP data fetch karein.
  let userData = await redisClient.get(otpKey);

  // 4. Check karein ki OTP session exist karta hai ya nahi.
  if (!userData) {
    throw new apiError(
      400,
      "OTP session expired or invalid. Please try the reset flow again."
    );
  }

  userData = JSON.parse(userData);

  // 5. Check karein ki OTP verify ho chuka hai ya nahi.
  if (!userData.isVerified) {
    throw new apiError(400, "OTP not verified. Please verify the OTP first.");
  }

  // 6. Database se user document find karein.
  // .lean() remove kiya hai taaki document save ho sake.
  const user = await User.findOne({ email });

  // Agar user nahi mila to error dein
  if (!user) {
    throw new apiError(404, "User not found.");
  }

  // 7. Sabse important step: Naye password ko seedha hash karein
  // Uske baad user object mein set karein.

  user.password = password;

  // 8. Hashed password ko database mein save karein.
  // Ab save() call karne par password update ho jayega.
  await user.save();

  // 9. Security Fix: Redis se OTP key delete karein taaki dobara use na ho sake.
  await redisClient.del(otpKey);

  // 10. Success response bhejein.
  return apiResponse(
    res,
    200,
    {},
    "Password has been reset successfully. yahhooo"
  );
});
