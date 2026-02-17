import { getAllSessions } from "../controllers/userSessions.controller.js";
import { Router } from "express";

const router: Router = Router();

router.get("/all", getAllSessions);

export default router;
