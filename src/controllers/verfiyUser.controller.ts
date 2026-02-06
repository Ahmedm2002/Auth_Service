import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import type { Request, Response } from "express";
import User from "../repositories/user.repo.js";
import verificationTokens from "../repositories/verification_tokens.repo.js";

async function verifyEmail(req: Request, res: Response) {
  const { code, email } = req.body;
  try {
    if (!code || !email || code.length < 4) {
      return res
        .status(400)
        .json(new ApiError(400, "Please enter 4 verification code"));
    }

    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    const token = await verificationTokens.getUserCode(user.id);
    if (!token) {
      return res
        .status(404)
        .json(new ApiError(404, "No code found. Please signup"));
    }

    if (token.used_at) {
      return res
        .status(200)
        .json(new ApiResponse(200, "Email already verified"));
    }

    const expires_at = new Date(
      token.created_at.setMinutes(token.created_at.getMinutes() + 10)
    );
    console.log("Expires in :", expires_at);
    // if(token.created_at )
    return res.status(200).json({});
  } catch (error) {}
}

export { verifyEmail };
