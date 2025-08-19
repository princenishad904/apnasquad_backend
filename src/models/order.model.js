import mongoose from "mongoose";
const OrderSchema = new mongoose.Schema({
  orderId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  status: { type: String, default: "CREATED" },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", OrderSchema);

export default Order;
