import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteTournament,
  deleteUser,
  getDashboardData,
  getUsers,
  updateTournament,
  updateUser,
} from "../controllers/admin.controller.js";
import {
  getAllWithdrawals,
  updateWithdrawStatus,
} from "../controllers/withdraw.controller.js";

const adminRoute = Router();

adminRoute.route("/dashboard").get(verifyJWT, getDashboardData);
adminRoute.route("/update/:id").patch(verifyJWT, updateTournament);
adminRoute.route("/delete/:id").delete(verifyJWT, deleteTournament);
adminRoute.route("/users").get(verifyJWT, getUsers);
adminRoute.route("/delete-user/:id").delete(verifyJWT, deleteUser);
adminRoute.route("/update-user/:id").patch(verifyJWT, updateUser);

// payemebnts

adminRoute.route("/get-withdrawals").get(verifyJWT, getAllWithdrawals);

// withdraw
adminRoute.route("/update-withdraw").post(verifyJWT, updateWithdrawStatus);

export default adminRoute;
