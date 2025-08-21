import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  NODE: process.env.NODE,

  CLIENT_URL: process.env.CLIENT_URL,

  MONGO_URI:
    process.env.MONGO_URI ||
    "mongodb+srv://pn3147399:5cdLNld3ODzvJUqv@cluster0.7viug.mongodb.net/apnasquad",

  UPSTASH_REDIS_CONN: process.env.UPSTASH_REDIS_CONN,
  REDIS_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  SECRET: process.env.SECRET,

  SENDER_EMAIL: process.env.EMAIL_SEND_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,

  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  // image kit

  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT,

  // cashfree
  CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
  CASHFREE_WEBHOOK_URL: process.env.CASHFREE_URL,
};
