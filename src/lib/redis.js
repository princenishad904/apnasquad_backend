import { config } from "../config/index.js";
import { Redis } from "@upstash/redis";

export const redisClient = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});
