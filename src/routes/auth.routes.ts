import { loginUser, signupUser } from "../controllers/auth.controller.js";
import { Router } from "express";

const router: Router = Router();

router.post("/login", loginUser);
router.post("/signup", signupUser);

export default router;
