import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["solo", "duo", "squad"],
      required: true,
    },
    entryFee: {
      type: Number,
      required: true,
    },
    prizePool: {
      type: Number,
      required: true,
    },
    totalSpots: {
      type: Number,
      required: true,
    },
    joinedSpots: {
      type: Number,
      default: 0,
    },
    matchTime: {
      type: Date,
      required: true,
    },
    map: {
      type: String,
      default: "Erangel",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin user
      required: true,
    },
    roomId: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["live", "end"],
      default: "live",
    },
    password: {
      type: String,
      default: "",
    },
    publish: {
      type: Boolean,
      default: false,
    },
    prizeDistribution: [
      {
        rank: {
          type: Number,
          required: true,
        },
        prize: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);
export default Tournament;
