import { Router } from "express";
import { verifyEmail } from "../controllers/verfiyUser.controller.js";

const router: Router = Router();

router.post("/email", verifyEmail);

export default router;
