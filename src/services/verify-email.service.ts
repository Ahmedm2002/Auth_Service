import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import type { userI } from "../interfaces/user.model.js";
import Users from "../repositories/user.repo.js";
import emaiVerification from "../repositories/verify_email.repo.js";
import type { EmailVerificationI } from "../interfaces/email-verification.model.js";
import bcrypt from "bcrypt";
import CONSTANTS from "../constants.js";
import sendVerificationCode from "../utils/nodeMailer/sendVerificationEmail.js";
import isValidEmail from "../utils/helperFuncs/isValidEmail.js";
import logger from "../utils/logger/logger.js";

class VerifyUserService {
  constructor() {}
  /**
   *
   * @param email
   * @param code
   * @returns
   */
  async verifyEmail(
    email: string,
    code: string,
  ): Promise<ApiError | ApiResponse<null>> {
    if (!code || !email || code.length !== 4) {
      return new ApiError(400, "Please enter 4 verification code");
    }
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }
    try {
      const user: userI = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      const token: EmailVerificationI = await emaiVerification.getUserCode(
        user.id!,
      );
      if (!token) {
        return new ApiError(
          404,
          "No code found. Please signup or send click resend token",
        );
      }

      if (token.used_at) {
        return new ApiResponse(200, null, "Email already verified");
      }

      const issuedAt = new Date(token.created_at).getTime();
      const expires = issuedAt + CONSTANTS.OTP_EXPIRY_MS;

      if (Date.now() > expires) {
        return new ApiError(400, "Token Expired");
      }

      const isTokenMatched = await bcrypt.compare(code, token.token_hash);

      if (!isTokenMatched) {
        return new ApiError(400, "Invalid code");
      }

      await Users.setUserVerified(user.id!, token.id);

      return new ApiResponse(200, null, "User verified successfully");
    } catch (error: any) {
      logger.error({ err: error }, "Email verification failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
  /**
   *
   * @param email
   * @returns
   */
  async resendCode(email: string): Promise<ApiError | ApiResponse<null>> {
    if (!email) {
      return new ApiError(400, "Email Required");
    }
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }
    try {
      const user = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      if (user.verified_at) {
        return new ApiResponse(200, null, "User already verified");
      }

      const token = await sendVerificationCode(user.email, user.name);
      const token_hash = await bcrypt.hash(token, 10);
      await emaiVerification.insert(user.id!, token_hash);

      return new ApiResponse(201, null, "Code send to email");
    } catch (error: any) {
      logger.error({ err: error }, "Resend verification code failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const verifyUserServ = new VerifyUserService();

export default verifyUserServ;
