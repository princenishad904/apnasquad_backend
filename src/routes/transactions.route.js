import { Router } from "express";
import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { withdrawFunds } from "../controllers/withdraw.controller.js";

const transactionRoute = Router();

transactionRoute.route("/withdraw").post(verifyJWT, withdrawFunds);

export default transactionRoute;
