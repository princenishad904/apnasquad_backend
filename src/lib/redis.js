import { config } from "../config/index.js";
import Redis from "ioredis";

export const redisClient = new Redis(
  "rediss://default:ASKjAAImcDE2ZjZhZmI0MzU1ZDU0ZThjOGFhZTQwN2JmMGI3YzkzNHAxODg2Nw@legible-stag-8867.upstash.io:6379"
);
