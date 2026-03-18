import { Router } from "express";
import { healthCheck } from "../../controllers/health.controller.js";
import rateLimiter from "../../middlewares/rateLimitter.middleware.js";

const router: Router = Router();

router.get("/", rateLimiter.healthLimiter, healthCheck);

export default router;
