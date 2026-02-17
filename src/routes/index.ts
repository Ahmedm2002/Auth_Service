import { Router } from "express";
import authRoutes from "./auth.routes.js";
import verficationRoutes from "./verifyUser.routes.js";
import sessionRoutes from "./userSessions.routes.js";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/verify", verficationRoutes);
router.use("/user-session", sessionRoutes);

export default router;
