import { Router } from "express";
import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import {
  getMyTransactions,
  updateUserPrfile,
} from "../controllers/user.controller.js";
import {
  createOrder,
  webhookVerification,
} from "../controllers/cashfree.controller.js";
const userRoutes = Router();
import bodyParser from "body-parser";

userRoutes
  .route("/update")
  .patch(verifyJWT, upload.single("profileImage"), updateUserPrfile);

userRoutes.route("/create-order").post(express.json(), createOrder);

userRoutes.route("/get-transaction").get(verifyJWT, getMyTransactions);
userRoutes
  .route("/webhook/cashfree")
  .post(bodyParser.raw({ type: "*/*" }), webhookVerification);

export default userRoutes;
