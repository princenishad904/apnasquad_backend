import { Router } from "express";
import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createOrder,
  orderStatus,
  webhookVerification,
} from "../controllers/cashfree.controller.js";
const paymentRoutes = Router();
import bodyParser from "body-parser";

paymentRoutes
  .route("/create-order")
  .post(express.json({ limit: "1mb" }), createOrder);

paymentRoutes
  .route("/webhook/cashfree")
  .post(bodyParser.raw({ type: "*/*" }), webhookVerification);

paymentRoutes
  .route("/order-status")
  .get(express.json({ limit: "1mb" }), orderStatus);

export default paymentRoutes;
