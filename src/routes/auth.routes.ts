import {
  loginUser,
  signupUser,
  getAllUsers,
} from "../controllers/auth.controller.js";
import { Router } from "express";

const router: Router = Router();

router.post("/login", loginUser);
router.post("/signup", signupUser);
router.get("/all-users", getAllUsers);

export default router;
