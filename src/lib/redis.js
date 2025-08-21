import { config } from "../config/index.js";
import Redis from "ioredis";

export const redisClient = new Redis(
  `rediss://default:${config.UPSTASH_REDIS_CONN}`
);
