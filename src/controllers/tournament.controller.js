import Tournament from "../models/tournament.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import Registration from "../models/registration.model.js";

export const createTournament = asyncHandler(async (req, res) => {
  const {
    title,
    mode,
    entryFee,
    prizePool,
    totalSpots,
    matchTime,
    map,
    prizeDistribution,
  } = req.body;
  console.log(prizeDistribution);
  const requiredFields = {
    title,
    mode,
    entryFee,
    prizePool,
    totalSpots,
    matchTime,
    map,
    prizeDistribution,
  };
  for (const [field, value] of Object.entries(requiredFields)) {
    // String values ke liye trim() use kar rahe hain taaki empty spaces ko ignore kiya ja sake.
    if (typeof value === "string" && !value.trim()) {
      throw new apiError(
        400,
        `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
      );
    }
    if (value === undefined || value === null) {
      throw new apiError(
        400,
        `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
      );
    }
  }

  if (isNaN(Number(entryFee)) || Number(entryFee) < 0) {
    throw new apiError(400, "Entry fee must be a non-negative number.");
  }
  if (isNaN(Number(prizePool)) || Number(prizePool) <= 0) {
    throw new apiError(400, "Prize pool must be a positive number.");
  }
  if (isNaN(Number(totalSpots)) || Number(totalSpots) < 2) {
    throw new apiError(400, "Total spots must be a number greater than 1.");
  }
  if (new Date(matchTime) <= new Date()) {
    throw new apiError(400, "Match time must be in the future.");
  }
  if (!Array.isArray(prizeDistribution) || prizeDistribution.length === 0) {
    throw new apiError(400, "Price distribution must be a non-empty array.");
  }

  const totalPrizeFromDistribution = prizeDistribution.reduce(
    (sum, rank) => sum + Number(rank.prize),
    0
  );
  console.log(totalPrizeFromDistribution, prizePool);
  if (totalPrizeFromDistribution !== Number(prizePool)) {
    throw new apiError(
      400,
      "The sum of prizee distribution must be Less then to the prize pool."
    );
  }

  const createdBy = req.user?._id;

  if (!createdBy) {
    throw new apiError(
      401,
      "User not authenticated. Cannot create tournament."
    );
  }

  const tournament = await Tournament.create({
    title,
    mode,
    map,
    entryFee: Number(entryFee),
    prizePool: Number(prizePool),
    totalSpots: Number(totalSpots),
    matchTime,
    prizeDistribution,
    createdBy, // `createdBy` field add kiya.
  });

  if (!tournament) {
    throw new apiError(
      500,
      "Something went wrong while creating the tournament."
    );
  }

  return apiResponse(
    res,
    200,
    tournament,
    "Tournament created successfully and is now live!"
  );
});

export const updateTournament = asyncHandler(async (req, res) => {
  const fieldsToBeUpdate = req.body;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new apiError(400, "Invalid Tournament ID format.");
  }

  // Check karte hain ki body mein update karne ke liye data hai ya nahi
  if (Object.keys(updates).length === 0) {
    throw new apiError(400, "No fields provided to update.");
  }

  // 3. Find the tournament first
  const tournament = await Tournament.findById(id);

  if (!tournament) {
    throw new apiError(404, "Tournament not found.");
  }

  const updated = await Tournament.findByIdAndUpdate(
    { _id: id },
    { $set: { ...fieldsToBeUpdate } },
    { new: true }
  ).lean();

  if (!updated) throw new apiError(404, "tournament not found try again ");

  return apiResponse(res, 200, updated, "Tournament updation success");
});

export const deleteTournaments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id))
    throw new apiError(400, "invalid tournamet id");

  const deleted = Tournament.findByIdAndDelete({ _id: id });

  if (!deleted) throw new apiError(400, "Failed to delete tournament");

  return apiResponse(res, 200, {}, "Tournaments deleted Successfull ");
});

export const getHomePageTournaments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const map = req.query.map;
  const mode = req.query.mode;
  const status = req.query.status;
  const matchTime = req.query.matchTime;

  const skip = (page - 1) * limit;

  const query = {
    isActive: true,
    isCompleted: false,
    status: "live",
    matchTime: { $gt: new Date() },
  };

  if (map) {
    query.map = map;
  }

  if (mode) {
    query.mode = mode;
  }

  if (status) {
    query.status = status;
  }
  if (matchTime) {
    query.matchTime = { ...query.matchTime, $gt: new Date(matchTime) };
  }

  const [tournaments, totalTournaments] = await Promise.all([
    Tournament.find(query)
      .sort({ matchTime: 1 })
      .skip(skip)
      .limit(limit)
      .select("-password -roomId")
      .lean(),
    Tournament.countDocuments(query),
  ]);

  if (!tournaments || tournaments.length === 0) {
    return apiResponse(res, 200, {
      tournaments: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalResults: 0,
      },
    });
  }

  const totalPages = Math.ceil(totalTournaments / limit);

  return apiResponse(
    res,
    200,
    {
      tournaments,
      pagination: {
        currentPage: page,
        limit,
        totalPages,
        totalResults: totalTournaments,
      },
    },
    "Upcoming tournaments fetched successfully."
  );
});

export const getTournamentDetails = asyncHandler(async (req, res) => {
  const { tournamentId } = req.query;
  const userId = req.user?._id;

  // 1. Tournament details (full lelo, sensitive baad me filter karenge)
  const tournamentDetailsRaw = await Tournament.findById(tournamentId)
    .select("-__v")
    .lean();

  if (!tournamentDetailsRaw) {
    throw new apiError(404, "Tournament not found.");
  }

  // 2. Tournament ke saare registrations ek saath fetch karo
  let registeredTeams = await Registration.find({ tournament: tournamentId })
    .populate({
      path: "players.user",
      select: "name bgmiId avatar teamName phone",
    })
    .select("name bgmiId avatar teamName teamId teamPassword players")
    .lean();

  // 3. Check karo user join hai ki nahi & apne team ka data nikalo
  let isRegistered = false;
  let myTeamId = null;
  let myTeamPassword = null;

  registeredTeams = registeredTeams.map((team) => {
    const isUserInTeam = team.players.some(
      (p) => p.user && p.user._id.toString() === userId.toString()
    );

    if (isUserInTeam) {
      isRegistered = true;
      myTeamId = team.teamId;
      myTeamPassword = team.teamPassword;
    }

    // Dusri teams ka sensitive data hata do
    const { teamId, teamPassword, ...rest } = team;
    // Sirf admin ke liye players ke user object mein phone number add karo
    if (req.user.admin === "admin") {
      rest.players = rest.players.map((player) => {
        // Yahan phoneNumber ko seedhe player ke user object mein add kar rahe hain
        return {
          ...player,
          user: {
            ...player.user,
            phone: player.user.phone, // Make sure you are populating phoneNumber
          },
        };
      });
    }

    return rest;
  });

  // 4. Room details sirf joined hone par
  let roomDetails = {};
  if (isRegistered) {
    roomDetails = {
      roomId: tournamentDetailsRaw.roomId,
      password: tournamentDetailsRaw.password,
    };
  }

  // 5. Tournament details me sensitive fields remove if not joined
  const tournamentDetails = { ...tournamentDetailsRaw };
  if (!isRegistered) {
    delete tournamentDetails.roomId;
    delete tournamentDetails.password;
  }

  // 6. Final response assemble karo
  const responseData = {
    tournament: {
      ...tournamentDetails,
      ...roomDetails,
    },
    teams: registeredTeams,
    isJoined: Boolean(isRegistered),
    teamId: myTeamId || undefined,
    teamPassword: myTeamPassword || undefined,
  };

  return apiResponse(
    res,
    200,
    responseData,
    "Tournament details fetched successfully."
  );
});

export const getMyTournaments = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 5 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const totalRegistrationsCount = await Registration.countDocuments({
    "players.user": userId,
  });

  const registeredTournaments = await Registration.find({
    "players.user": userId,
  })
    .populate("tournament")
    .select("-prizeDistribution")
    .skip(skip)
    .limit(parseInt(limit));

  if (registeredTournaments.length === 0) {
    return res.status(200).json({
      message: "You have not registered for any tournaments yet.",
      liveTournaments: [],
      completedTournaments: [],
      pagination: {
        totalDocs: 0,
        limit: parseInt(limit),
        page: parseInt(page),
        totalPages: 0,
      },
    });
  }

  const liveTournaments = [];
  const completedTournaments = [];

  registeredTournaments.forEach((registration) => {
    if (registration.tournament) {
      if (registration.tournament.isCompleted === false) {
        liveTournaments.push(registration.tournament);
      } else if (registration.tournament.isCompleted) {
        completedTournaments.push(registration.tournament);
      }
    }
  });

  const totalPages = Math.ceil(totalRegistrationsCount / parseInt(limit));

  return apiResponse(
    res,
    200,
    {
      liveTournaments,
      completedTournaments,
      pagination: {
        totalDocs: totalRegistrationsCount,
        limit: parseInt(limit),
        page: parseInt(page),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
    "Fetched success"
  );
});
