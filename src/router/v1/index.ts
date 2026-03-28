import { Router } from "express";
import authRoutes from "./auth.routes.js";
import verficationRoutes from "./verifyUser.routes.js";
import sessionRoutes from "./userSessions.routes.js";
import resetPassRoutes from "./resetPassword.routes.js";
import healthRoutes from "./health.routes.js";

const router: Router = Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/verify", verficationRoutes);
router.use("/v1/user-session", sessionRoutes);
router.use("/v1/password", resetPassRoutes);
router.use("/v1/health", healthRoutes);

export default router;
