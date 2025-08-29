import { Router } from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTournament,
  getHomePageTournaments,
  getMyTournaments,
  getTournamentDetails,
} from "../controllers/tournament.controller.js";
import {
  joinTeam,
  registrationInTournament,
} from "../controllers/register.controller.js";
const tournamentRoute = Router();

tournamentRoute.route("/create").post(verifyJWT,isAdmin, createTournament);
tournamentRoute.route("/get").get(verifyJWT, getHomePageTournaments);
tournamentRoute.route("/get-my-tournaments").get(verifyJWT, getMyTournaments);

tournamentRoute.route("/get-details").get(verifyJWT, getTournamentDetails);

// registration in
tournamentRoute.route("/join").post(verifyJWT, registrationInTournament);
tournamentRoute.route("/join-team").post(verifyJWT, joinTeam);

export default tournamentRoute;
