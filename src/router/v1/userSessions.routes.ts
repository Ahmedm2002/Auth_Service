import {
  getAllSessions,
  invalidateSession,
  logOutAllDevices,
  getAccessToken,
} from "../../controllers/userSessions.controller.js";
import { Router } from "express";

const router: Router = Router();

router.get("/all", getAllSessions);
router.delete("/log-out", invalidateSession);
router.post("/log-out/all-sessions", logOutAllDevices);
router.post("/get-access-token", getAccessToken);

export default router;
