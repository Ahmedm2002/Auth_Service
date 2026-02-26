import {
  getAllSessions,
  invalidateSession,
  logOutAllDevices,
} from "../../controllers/userSessions.controller.js";
import { Router } from "express";

const router: Router = Router();

router.get("/all", getAllSessions);
router.delete("/log-out", invalidateSession);
router.post("/log-out/all-sessions", logOutAllDevices);

export default router;
