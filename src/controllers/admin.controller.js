import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import Transaction from "../models/transaction.model.js";
import Tournament from "../models/tournament.model.js";
import Registration from "../models/registration.model.js";
import moment from "moment";

export const getDashboardData = asyncHandler(async (req, res) => {
  // 1. Stats Cards Data
  const totalTournaments = await Tournament.countDocuments({});
  const liveMatches = await Tournament.countDocuments({ status: "live" });
  const totalPlayers = await User.countDocuments({});

  // Total Earnings
  const paidRegistrations = await Registration.find({
    payment: "PAID",
  }).populate("tournament");
  let totalEarnings = 0;
  paidRegistrations.forEach((reg) => {
    if (reg.tournament) {
      totalEarnings += reg.tournament.entryFee;
    }
  });

  // Calculate changes for stats (Example logic)
  const lastMonthTournaments = await Tournament.countDocuments({
    createdAt: {
      $gte: moment().subtract(1, "month").startOf("month").toDate(),
    },
  });
  const tournamentChange = (
    ((totalTournaments - lastMonthTournaments) / lastMonthTournaments) *
    100
  ).toFixed(2);
  const tournamentChangeText = `+${tournamentChange}% this month`;

  const newPlayersThisWeek = await User.countDocuments({
    createdAt: { $gte: moment().subtract(1, "week").startOf("week").toDate() },
  });
  const newPlayersText = `+${newPlayersThisWeek} new players this week`;

  // 2. Revenue Analytics (Line Chart) Data
  const monthlyRevenue = [];
  const monthlyLabels = [];
  for (let i = 6; i >= 0; i--) {
    const monthStart = moment().subtract(i, "months").startOf("month").toDate();
    const monthEnd = moment().subtract(i, "months").endOf("month").toDate();

    const monthlyPaidRegistrations = await Registration.find({
      payment: "PAID",
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }).populate("tournament");

    let revenueForMonth = 0;
    monthlyPaidRegistrations.forEach((reg) => {
      if (reg.tournament) {
        revenueForMonth += reg.tournament.entryFee;
      }
    });

    monthlyRevenue.push(revenueForMonth);
    monthlyLabels.push(moment(monthStart).format("MMM"));
  }

  // 3. Tournament Status (Doughnut Chart) Data
  const completedTournaments = await Tournament.countDocuments({
    isCompleted: true,
  });
  const liveTournamentsCount = await Tournament.countDocuments({
    status: "live",
  });
  const upcomingTournaments = await Tournament.countDocuments({
    matchTime: { $gt: new Date() },
    isCompleted: false,
    status: { $ne: "end" },
  });

  // 4. Recent Tournaments Table Data
  const recentTournaments = await Tournament.find({})
    .select("title map prizePool totalSpots joinedSpots status")

    .sort({ createdAt: -1 })
    .limit(5);

  return apiResponse(
    res,
    200,
    {
      stats: [
        {
          title: "Total Tournaments",
          value: totalTournaments,
          change: tournamentChangeText,
        },
        {
          title: "Live Matches",
          value: liveMatches,
          change: "Currently active",
        },
        {
          title: "Total Players",
          value: totalPlayers,
          change: newPlayersText,
        },
        {
          title: "Total Earnings",
          value: `₹${totalEarnings}`,
          change: `+${5230} this month`,
        },
      ],
      lineChartData: {
        labels: monthlyLabels,
        datasets: [
          {
            label: "Revenue",
            data: monthlyRevenue,
          },
        ],
      },
      doughnutChartData: {
        labels: ["Completed", "Live", "Upcoming"],
        datasets: [
          {
            data: [
              completedTournaments,
              liveTournamentsCount,
              upcomingTournaments,
            ],
          },
        ],
      },
      recentTournaments: recentTournaments.map((t) => ({
        name: t.title,
        game: t.map,
        prize: `$${t.prizePool}`,
        spots: `${t.joinedSpots}/${t.totalSpots}`,
        status:
          t.status === "live" ? "Live" : t.isCompleted ? "Completed" : "End",
      })),
    },

    "dashboard analytics fetched"
  );
});

export const updateTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get data directly from `req.body`
  const updateData = req.body;

  // Check if any data is provided to update
  if (Object.keys(updateData).length === 0) {
    throw new apiError(400, "What you want to update");
  }

  // Use findByIdAndUpdate to get the updated document
  const updatedTournament = await Tournament.findByIdAndUpdate(
    id,
    {
      $set: updateData,
    },
    { new: true, runValidators: true } // `new: true` returns the updated document, `runValidators` ensures schema validation runs
  );

  // If the tournament is not found
  if (!updatedTournament) {
    throw new apiError(404, "Tournament not found");
  }

  // Send a successful response
  return apiResponse(
    res,
    200,
    updatedTournament,
    "Tournament updated successfully"
  );
});

export const deleteTournament = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Tournament.findByIdAndDelete(id);

  if (!deleted) throw new apiError(400, "tournament not found");

  return apiResponse(res, 200, deleted, "Tournament deleted successfully");
});

export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Search query ko better handle karna
  const query = {};
  if (req.query.phone) query.phone = req.query.phone;
  if (req.query.email) query.email = req.query.email;
  if (req.query.bgmiId) query.bgmiId = req.query.bgmiId;
  if (req.query.role) query.role = req.query.role;
  if (req.query.id) query._id = req.query.id; // ObjectId se search karne ke liye _id use karein

  // Sabse pehle total count find karo
  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  // Fir users find karo with pagination
  const users = await User.find(query)
    .sort() // Aap yahan sorting bhi specify kar sakte hain, jaise { createdAt: -1 }
    .skip(skip)
    .limit(limit)
    .select(
      "-password -__v -refreshToken -fileId -referredBy -referralCode -teamName -googleId"
    )
    .lean();

  if (!users) throw new apiError(400, "Failed to get users");

  // Response ko ek object mein wrap karein
  const responseData = {
    users,
    currentPage: page,
    totalPages,
    totalUsers,
    limit,
  };

  return apiResponse(res, 200, responseData, "Users fetched successfully");
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await User.findByIdAndDelete(id);

  if (!deleted) throw new apiError(400, "user not found");

  return apiResponse(res, 200, {}, "User deleted success");
});

// update user

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get data directly from `req.body`
  const updateData = req.body;

  // Check if any data is provided to update
  if (Object.keys(updateData).length === 0) {
    throw new apiError(400, "What you want to update");
  }

  // Use findByIdAndUpdate to get the updated document
  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      $set: updateData,
    },
    { new: true, runValidators: true } // `new: true` returns the updated document, `runValidators` ensures schema validation runs
  );

  // If the tournament is not found
  if (!updatedUser) {
    throw new apiError(404, "user not found");
  }

  // Send a successful response
  return apiResponse(res, 200, updatedUser, "User updated successfully");
});
