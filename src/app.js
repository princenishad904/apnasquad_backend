import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import helmet from "helmet";
import errorHandler from "./middlewares/errorHandler.js";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import compression from "compression";
import bodyParser from "body-parser";
import { apiResponse } from "./utils/apiResponse.js";
import authRoutes from "./routes/auth.route.js";
import { verifyJWT } from "./middlewares/auth.middleware.js";
import userRoutes from "./routes/user.route.js";
import tournamentRoute from "./routes/tournament.route.js";
import paymentRoutes from "./routes/payment.route.js";
import adminRoute from "./routes/admin.route.js";
import transactionRoute from "./routes/transactions.route.js";

import { redisClient } from "./lib/redis.js";
const app = express();
app.use(helmet());

app.use(
  cors({
    origin: "https://apnasquad.vercel.app",
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(
  session({
    secret: config.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 2,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(
  rateLimit({
    windowMs: 1000 * 60 * 60,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api/v1/payment", paymentRoutes);
app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(cookieParser());
// Agar tum proxy/ngrok/Cloudflare use kar rahe ho to ye zaroor lagao
app.use(compression());

app.get("/", (req, res) => {
  res.send("hello");
});

app.use("/api/v1/auth", authRoutes);

// user routes
app.use("/api/v1/user", userRoutes);

app.get("/api/v1/health", verifyJWT, (req, res) => {
  return apiResponse(res, 200, {}, "everything is fine");
});

// tournaments routes
app.use("/api/v1/tournament", tournamentRoute);

// transation route
app.use("/api/v1/money", transactionRoute);

// admin

app.use("/api/v1/admin", adminRoute);

app.use(errorHandler);

export default app;
