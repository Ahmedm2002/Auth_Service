import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import type { Request, Response } from "express";
import User from "../repositories/user.repo.js";
import bcrypt from "bcrypt";
import verificationTokens from "../repositories/verification_tokens.repo.js";
import sendVerificationCode from "../services/nodeMailer/sendVerificationEmail.js";
import type { VerificationsTokenI } from "../models/verification-tokens.model.js";
import type { userI } from "../models/user.model.js";
import CONSTANTS from "../constants.js";

async function verifyEmail(req: Request, res: Response) {
  const { code, email } = req.body;
  try {
    if (!code || !email || code.length < 4) {
      return res
        .status(400)
        .json(new ApiError(400, "Please enter 4 verification code"));
    }

    const user: userI = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    const token: VerificationsTokenI = await verificationTokens.getUserCode(
      user.id!
    );
    if (!token) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "No code found. Please signup or send click resend token"
          )
        );
    }

    if (token.used_at) {
      return res
        .status(200)
        .json(new ApiResponse(200, "Email already verified"));
    }

    const issuedAt = new Date(token.created_at).getTime();
    const expires = issuedAt + 300000;

    if (Date.now() > expires) {
      return res.status(400).json(new ApiError(400, "Token Expired"));
    }

    const isTokenMatched = await bcrypt.compare(code, token.token_hash);

    if (!isTokenMatched) {
      return res.status(400).json(new ApiError(400, "Invalid code"));
    }

    // Success case token matched and not used and not expired
    await User.setUserVerified(user.id!, token.id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "User verified successfully"));
  } catch (error: any) {
    console.log("Error occured while verifying email: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

async function resendCode(req: Request, res: Response) {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json(new ApiError(400, "Email Required"));
    }
    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    if (user.verified_at) {
      return res
        .status(200)
        .json(new ApiResponse(200, user, "User already verified"));
    }

    const token = await sendVerificationCode(user.email, user.name);
    console.log("Token Send to ", user.email, ": ", token);
    const token_hash = await bcrypt.hash(token, 10);
    await verificationTokens.insert(user.id!, token_hash);

    return res.status(200).json(new ApiResponse(200, "Code send to email"));
  } catch (error: any) {
    console.log("Error while resending user's code : ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { verifyEmail, resendCode };
