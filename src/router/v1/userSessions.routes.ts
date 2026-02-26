import {
  getAllSessions,
  invalidateSession,
} from "../../controllers/userSessions.controller.js";
import { Router } from "express";

const router: Router = Router();

router.get("/all", getAllSessions);
router.delete("/", invalidateSession);

export default router;
