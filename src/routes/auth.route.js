import { Router } from "express";
import {
  getLoggedInUser,
  login,
  logout,
  resetPassword,
  sendResetPasswordOtp,
  signUp,
  verifyAndSignUp,
  verifyResetPasswordOtp,
} from "../controllers/auth/signUp.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const authRoutes = Router();

// authRoutes.post("/sign-up", signUp);
authRoutes.route("/sign-up").post(signUp);

// authRoutes.post("/verify-otp", verifyAndSignUp);
authRoutes.route("/verify-otp").post(verifyAndSignUp);

// authRoutes.post("/login", login);
authRoutes.route("/login").post(login);

// authRoutes.get("/me", verifyJWT, getLoggedInUser);
authRoutes.route("/me").get(verifyJWT, getLoggedInUser);

authRoutes.route("/logout").post(verifyJWT, logout);

authRoutes.route("/request-otp").post(sendResetPasswordOtp);
authRoutes.route("/verify-otp-for-reset-password").post(verifyResetPasswordOtp);
authRoutes.route("/reset-password").post(resetPassword);

export default authRoutes;
