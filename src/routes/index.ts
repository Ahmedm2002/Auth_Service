import authRoutes from "./auth.routes.js";
import verficationRoutes from "./verifyUser.routes.js";
import { Router } from "express";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/verify", verficationRoutes);

export default router;
