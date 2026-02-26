import { Router } from "express";
import {
  resendCode,
  verifyEmail,
} from "../../controllers/verfiyUser.controller.js";

const router: Router = Router();

router.post("/email", verifyEmail);
router.post("/resend-code", resendCode);

export default router;
