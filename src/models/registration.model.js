import mongoose from "mongoose";
const registrationSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    mode: {
      type: String,
      enum: ["squad", "duo", "solo"],
    },
    teamName: {
      type: String,
    },
    slot: {
      type: Number,
      default: 0,
    },
    teamId: {
      type: Number,
      required: true,
      trim: true,
      unique: true,
    },
    teamPassword: {
      type: Number,
      required: true,
      trim: true,
    },
    players: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        isCaptain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    payment: {
      type: String,
      enum: ["PAID", "PENDING", "UNPAID", "REFUNDED"],
    },
  },
  { timestamps: true }
);

const Registration = mongoose.model("Registration", registrationSchema);
export default Registration;
