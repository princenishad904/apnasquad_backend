// AApki existing imports yahan hain...
import { config } from "../config/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import crypto from "crypto";
import { apiResponse } from "../utils/apiResponse.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import axios from "axios";
import Transaction from "../models/transaction.model.js";

const CASHFREE_ORDERS_URL = config.CASHFREE_ORDERS_URL;
// const CASHFREE_ORDERS_URL = "https://sandbox.cashfree.com/pg/orders";

export const createOrder = asyncHandler(async (req, res) => {
  const { amount, _id, email, phone } = req.body;

  if (!_id) throw new apiError(400, "user not authorized please login");

  const order_id = `order_${crypto.randomBytes(10).toString("hex")}`;
  const transaction_id = `${crypto.randomBytes(10).toString("hex")}`;
  const payload = {
    order_currency: "INR",
    order_amount: amount,
    order_id: order_id,
    customer_details: {
      customer_id: _id,
      customer_phone: phone,
      customer_email: email,
      customer_transaction_id: transaction_id,
    },
    order_meta: {
      // notify_url: notifyUrl,
      return_url: `${config.CLIENT_URL}/payment/result?order_id=${order_id}`,
    },
  };

  const headers = {
    "x-api-version": "2025-01-01",
    "x-client-id": config.CASHFREE_APP_ID,
    "x-client-secret": config.CASHFREE_SECRET_KEY,
    "Content-Type": "application/json",
  };

  const response = await axios.post(CASHFREE_ORDERS_URL, payload, {
    headers,
  });

  if (!response) throw new apiError(400, "Failed to created order");

  await Order.create({
    orderId: order_id,
    userId: _id,
    amount,
  });

  await Transaction.create({
    user: _id,
    type: "deposit",
    amount,
    transactionId: transaction_id,
    orderId: order_id,
  });

  return apiResponse(res, 200, response.data, "Order created successfully");
});

export const webhookVerification = asyncHandler(async (req, res) => {
  const sigHeader = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];
  const webhookSecret = config.CASHFREE_SECRET_KEY;
  const rawBody = req.body;

  if (!sigHeader || !timestamp) {
    return res.status(400).send("Signature or timestamp header missing");
  }

  // Signature Verification
  try {
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(timestamp + rawBody)
      .digest("base64");

    if (expectedSig !== sigHeader) {
      return res.status(400).send("Invalid signature");
    }
  } catch (err) {
    return res.status(500).send("Error verifying signature");
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    return res.status(400).send("Invalid JSON payload");
  }

  const orderId = payload.data?.order?.order_id;
  const paymentStatus = payload.data?.payment?.payment_status;
  const amount = payload.data?.payment?.payment_amount;
  const failed_message = payload.data?.error_details?.error_description;

  // --- Code me yahan changes kiye gaye hain ---
  if (paymentStatus === "SUCCESS") {
    // Atomically find the order and update its status only if it's not already 'PAID'
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId, status: { $ne: "PAID" } }, // Condition: orderId matches AND status is NOT 'PAID'
      { $set: { status: "PAID" } }, // Action: Set status to 'PAID'
      { new: true } // Option: Return the updated document
    );

    if (!updatedOrder) {
      // If updatedOrder is null, it means the order was either not found or was
      // already processed. In a webhook, it's safer to assume the latter.
      console.log("Webhook already processed or order not found for:", orderId);
      return res.status(200).send("Already processed or not found");
    }

    // Since the update was successful (first time processing), proceed with other updates.
    await User.findByIdAndUpdate(updatedOrder.userId, {
      $inc: { balance: Number(amount) },
    });

    await Transaction.updateOne({ orderId }, { $set: { status: "success" } });
  }

  if (paymentStatus === "FAILED") {
    // Failed case mein bhi atomic update use kar sakte hain for consistency
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId, status: { $ne: "FAILED" } },
      { $set: { status: "FAILED" } },
      { new: true }
    );

    if (updatedOrder) {
      await Transaction.updateOne(
        { orderId },
        { $set: { status: "failed" }, description: failed_message }
      );
    }
  }

  return res.status(200).send("OK");
});

export const orderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.query;
  if (!orderId) throw new apiError(400, "order_id missing");

  const orderDetails = await Order.findOne({ orderId }).lean();

  if (!orderDetails) throw new apiError(400, "order details not found ");

  return apiResponse(res, 200, orderDetails, "Order fetched successfull");
});
