import { Router } from "express";
import {
  forgotPassword,
  resetPassword,
} from "../../controllers/resetPassword.controller.js";

const router: Router = Router();

router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

export default router;
