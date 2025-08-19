import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdraw", "join", "win"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1"],
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "processing"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["cashfree", "paytm", "upi", "wallet", "admin"], // optional
      default: "wallet",
    },
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      default: null,
    },
    transactionId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
