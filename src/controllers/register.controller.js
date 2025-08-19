import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import Transaction from "../models/transaction.model.js";
import Tournament from "../models/tournament.model.js";
import Registration from "../models/registration.model.js";
import mongoose from "mongoose";

import { generateOTP } from "../lib/generateOTP.js";

export const registrationInTournament = asyncHandler(async (req, res) => {
  const { tournamentId } = req.query;
  const userId = req.user._id;

  if (!userId) {
    throw new apiError(400, "Invalid user, please login.");
  }

  // 1. Fetch tournament and user details
  const [tournament, user] = await Promise.all([
    Tournament.findById(tournamentId).lean(),
    User.findById(userId).select("-password -refreshToken").lean(),
  ]);

  if (!tournament) {
    throw new apiError(404, "Tournament not found.");
  }
  if (!user) {
    throw new apiError(404, "User not found. Please log in again.");
  }

  if (!user.bgmiId)
    throw new apiError(404, "BGMI ID missing please update your profile");
  if (!user.phone)
    throw new apiError(404, "Phone number missing please update your profile");

  // 2. Check for spots and user registration
  if (tournament.totalSpots === tournament.joinedSpots) {
    throw new apiError(400, "Tournament is full. No spots available.");
  }

  const alreadyRegistered = await Registration.findOne({
    tournament: tournamentId,
    "players.user": userId,
  }).lean();

  if (alreadyRegistered) {
    throw new apiError(400, "You are already registered in this tournament.");
  }

  // 3. Calculate amounts to deduct
  const entryFee = tournament.entryFee;
  const bonusDeduction = Math.min(
    user.bonus || 0, // Available bonus balance
    entryFee * 0.05 // 5% of entry fee
  );
  const balanceDeduction = entryFee - bonusDeduction;

  // 4. Check for sufficient balance (main balance + bonus if needed)
  if (user.balance < balanceDeduction) {
    throw new apiError(400, "Insufficient balance.");
  }

  try {
    // 5. Update user balances atomically
    const updateObj = {
      $inc: {
        balance: -balanceDeduction,
        ...(bonusDeduction > 0 && { bonus: -bonusDeduction }),
      },
    };

    await User.findByIdAndUpdate(userId, updateObj, { new: true });

    // 6. Create registration entry
    const newRegistration = await Registration.create({
      tournament: tournamentId,
      mode: tournament.mode,
      teamId: Number(generateOTP(10)),
      slot: tournament.joinedSpots + 1,
      teamPassword: Number(generateOTP(6)),
      teamName: user.teamName || " ",
      players: [{ user: userId, isCaptain: true }],
      status: "confirmed",
      payment: "PAID",
    });

    if (!newRegistration) throw new apiError(400, "Sorry try again");

    // 7. Update tournament joinedSpots
    await Tournament.findByIdAndUpdate(
      tournamentId,
      { $inc: { joinedSpots: 1 } },
      { new: true }
    );

    // 8. Create a transaction record for history
    await Transaction.create({
      user: userId,
      type: "join",
      amount: entryFee,
      status: "success",
      tournament: tournament._id,
      description: `You have joined tournament. ${
        bonusDeduction > 0 ? `(Used ${bonusDeduction} from bonus balance)` : ""
      }`,
      bonusUsed: bonusDeduction,
    });

    return apiResponse(res, 200, {}, "Tournament joined successfully");
  } catch (error) {
    console.error("An error occurred during the registration process:", error);
    throw new apiError(500, "Registration failed due to an error.");
  }
});

export const joinTeam = asyncHandler(async (req, res) => {
  const { teamId, teamPassword } = req.body;
  const userId = req.user._id;

  if (!req.user.bgmiId)
    throw new apiError(404, "BGMI ID missing please update your profile");
  if (!req.user.phone)
    throw new apiError(404, "Phone number missing please update your profile");

  if (!userId) {
    throw new apiError(400, "Something went wrong, please login again.");
  }

  const team = await Registration.findOne({ teamId, teamPassword });

  if (!team) {
    throw new apiError(400, "Invalid Team ID or Team Password");
  }

  // Check if player is already in the team
  const isPlayerAlreadyInTeam = team.players.some(
    (player) => player.user.toString() === userId.toString()
  );
  if (isPlayerAlreadyInTeam) {
    throw new apiError(400, "You are already a member of this team.");
  }

  // Maximum players allowed per mode
  const maxPlayers = {
    squad: 4,
    duo: 2,
    solo: 1,
  };

  // Check if team is full based on its mode
  if (team.players.length >= maxPlayers[team.mode]) {
    throw new apiError(
      400,
      `Team is full. A ${team.mode.toLowerCase()} team can only have ${
        maxPlayers[team.mode]
      } players.`
    );
  }

  // Add the player to the team's players array
  team.players.push({ user: userId });

  await team.save();

  return apiResponse(res, 200, {}, "Team joined successfully");
});
