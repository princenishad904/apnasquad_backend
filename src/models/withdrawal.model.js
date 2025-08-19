// A simple Mongoose schema for handling withdrawal requests.
// Isko ES6 module ke taur par export kiya gaya hai.

import mongoose from "mongoose";

const { Schema } = mongoose;

// Define the Withdrawal Schema
const withdrawalSchema = new Schema({
  // Yeh field user ki ID ko store karega jiska withdrawal request hai.
  // 'ref' se yeh User model se link ho jayega.

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User", // Assume your user model is named 'User'
    required: [true, "User ID is required."],
  },

  // Withdrawal ki amount.
  amount: {
    type: Number,
    required: [true, "Amount is required."],
    min: [0.01, "Amount must be a positive number."],
  },
  // Withdrawal ka current status.
  // 'pending' -> 'processing' -> 'completed' / 'failed'
  status: {
    type: String,
    enum: ["pending", "processing", "success", "failed"],
    default: "processing",
    required: [true, "Status is required."],
  },
  // Jis method se paisa nikala ja raha hai.
  withdrawalMethod: {
    type: String,
    enum: ["upi", "bank"],
    default: "upi",
  },
  // Jab request create hui.
  createdAt: {
    type: Date,
    default: Date.now,
  },
  transactionId: {
    type: String,
    required: true,
  },
  // Jab request update hui.
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// `pre` middleware hook, yeh har `save` se pehle run hoga.
// Isse `updatedAt` field automatically update ho jayega.
withdrawalSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// `withdrawalSchema` se `Withdrawal` model create karo.
const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

// Model ko ES6 syntax se export karo.
export default Withdrawal;
