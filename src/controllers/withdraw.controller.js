import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import User from "../models/user.model.js";
import Withdrawal from "../models/withdrawal.model.js";
import Transaction from "../models/transaction.model.js";
import { generateOTP } from "../lib/generateOTP.js";
import { updateUser } from "./admin.controller.js";

// This function processes a withdrawal request from a user.
export const withdrawFunds = asyncHandler(async (req, res) => {
  // Request body se zaroori data nikalein.
  const { userId, amount, withdrawalMethod } = req.body;

  // Zaroori fields ke liye validation.
  if (!userId || !amount || !withdrawalMethod) {
    throw new apiError(
      400,
      "Please provide all required fields: userId, amount, and withdrawalMethod."
    );
  }

  // Amount ko number mein convert karein aur check karein ki woh positive hai ya nahi.
  const withdrawalAmount = Number(amount);
  if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
    throw new apiError(400, "Amount must be a positive number.");
  }

  if (withdrawalAmount > 5000) {
    throw new apiError(400, "Maximum Withdraw amount is ₹5000");
  }

  // User ko database mein find karein.
  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(400, "User not found.");
  }

  // Check karein ki user ke paas withdrawal ke liye sufficient balance hai ya nahi.
  if (user.balance < withdrawalAmount) {
    throw new apiError(400, "Insufficient balance for withdrawal.");
  }

  const transactionId = `T${generateOTP(14)}`;

  // Ek naya Transaction document create karein.
  const newTransaction = new Transaction({
    user: userId,
    type: "withdraw",
    amount,
    status: "pending",
    transactionId,
    method: withdrawalMethod,
  });

  // Withdrawal request ke liye ek naya document create karein.
  const newWithdrawal = new Withdrawal({
    userId,
    amount: withdrawalAmount,
    withdrawalMethod,
    transactionId,
    status: "pending", // Shuruat mein status 'pending' rakha hai.
  });

  // User ka balance update karein.
  user.balance -= withdrawalAmount;

  // Sabhi documents ko database mein save karein.
  await user.save({ validateBeforeSave: false }); // Validation off kiya kyunki password already hashed hai.
  await newWithdrawal.save();
  await newTransaction.save();

  // Success response bhej dein.
  return apiResponse(
    res,
    200,
    {
      newWithdrawal,
    },
    "Withdrawal  success."
  );
});

export const getAllWithdrawals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const transactionId = req.query.transactionId;
  const status = req.query.status;

  const query = {};

  if (transactionId) {
    query.transactionId = transactionId;
  }
  if (status) {
    query.status = status;
  }

  // Withdrawals ko pagination ke saath fetch karein.
  const withdrawals = await Withdrawal.find(query)
    .skip(skip)
    .limit(limit)
    .populate("userId", "name email upiId upiName phone avatar bgmiId");

  // Total number of withdrawal documents count karein.
  const totalWithdrawals = await Withdrawal.countDocuments();
  const totalPages = Math.ceil(totalWithdrawals / limit);

  // Response mein paginated data aur pagination info bhej dein.
  return apiResponse(
    res,
    200,
    {
      withdrawals,
      page,
      limit,
      totalPages,
      totalWithdrawals,
    },
    "All withdrawal requests fetched with pagination successfully."
  );
});

export const getUserWithdrawals = asyncHandler(async (req, res) => {
  // Request params ya body se userId lein.
  // Yahaan maine 'req.params.id' ka use kiya hai, jaise '/withdrawals/:id' route ke liye.
  const { userId } = req.params;

  // Validation
  if (!userId) {
    throw new apiError(400, "User ID is required.");
  }

  // Us user ke sabhi withdrawals ko find karein.
  const userWithdrawals = await Withdrawal.find({ userId });

  // Response mein us user ki withdrawals history bhej dein.
  return apiResponse(
    res,
    200,
    {
      userWithdrawals,
    },
    "User's withdrawal history fetched successfully."
  );
});

// for admin only

export const updateWithdrawStatus = asyncHandler(async (req, res) => {
  const { status, _id, transactionId } = req.body;

  if (!["pending", "processing", "failed", "success"].includes(status)) {
    throw new apiError(400, "Invalid status provided.");
  }

  // Pehle withdrawal record ko find karein
  const withdraw = await Withdrawal.findOne({ _id, transactionId })
    .populate("userId", "_id name email upiId upiName phone bgmiId balance")
    .lean();

  if (!withdraw) throw new apiError(404, "Withdrawal request not found");

  // Agar status already 'success' ya 'failed' hai to usko dobara update na karein
  if (["success", "failed"].includes(withdraw.status)) {
    throw new apiError(400, "Cannot update a finalized withdrawal status");
  }

  // Agar status 'success' hai, to user ka balance update karein
 if (status === "success") {
    // Yehi sabse critical part hai
    const updatedUser = await Transaction.findOneAndUpdate(
         { transactionId },
         { $set: { status: status } }
    );

    if (!updatedUser) {
      // Balance insufficient hai ya user update nahi hua, withdrawal ko 'failed' mark karein
      await Withdrawal.findOneAndUpdate(
        { _id, transactionId },
        { $set: { status: "failed" } }
      );
      throw new apiError(
        400,
        "Failed to find transaction"
      );
    }
}

  // Sabhi cases ke liye withdrawal status ko update karein
  const updatedWithdrawal = await Withdrawal.findOneAndUpdate(
    { _id, transactionId },
    { $set: { status: status } },
    { new: true }
  );

  if (!updatedWithdrawal) {
    // Agar upar success update hua, lekin yaha issue hai, to ye catch hoga
    throw new apiError(404, "Failed to update withdrawal status");
  }

  return apiResponse(
    res,
    200,
    updatedWithdrawal,
    "Withdrawal status updated successfully"
  );
});
