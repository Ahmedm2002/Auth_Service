import type { Response, Request } from "express";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";

import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";

async function loginUser(req: Request, res: Response): Promise<any> {
  const { email, password } = req.body;
  try {
    const validate = loginSchema.safeParse(req.body);
    if (!validate.success) {
      return res
        .status(400)
        .json(new ApiError(400, "Validation failed", validate.error.issues));
    }

    return res.status(200).json({});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

async function signupUser(req: Request, res: Response): Promise<any> {
  try {
    const validate = signupSchema.parse(req.body);
    return res.status(200).json({});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

export { loginUser, signupUser };
