import {
  loginUser,
  signupUser,
  getAllUsers,
} from "../controllers/auth.controller.js";
import { Router } from "express";
import rateLimiter from "../middlewares/rateLimitter.middleware.js";

const router: Router = Router();

router.post("/login", rateLimiter.authLimiter, loginUser);
router.post("/signup", rateLimiter.signupLimiter, signupUser);
router.get("/all-users", getAllUsers);

export default router;
