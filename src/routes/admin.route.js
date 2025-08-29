import { Router } from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
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

adminRoute.route("/dashboard").get(verifyJWT ,isAdmin, getDashboardData);

adminRoute.route("/update/:id").patch(verifyJWT ,isAdmin, updateTournament);

adminRoute.route("/delete/:id").delete(verifyJWT ,isAdmin, deleteTournament);

adminRoute.route("/users").get(verifyJWT ,isAdmin, getUsers);

adminRoute.route("/delete-user/:id").delete(verifyJWT ,isAdmin, deleteUser);

adminRoute.route("/update-user/:id").patch(verifyJWT ,isAdmin, updateUser);

// payemebnts

adminRoute.route("/get-withdrawals").get(verifyJWT, getAllWithdrawals);

// withdraw
adminRoute.route("/update-withdraw").post(verifyJWT,isAdmin, updateWithdrawStatus);

export default adminRoute;
