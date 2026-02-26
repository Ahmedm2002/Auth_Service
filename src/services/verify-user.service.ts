import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import type { userI } from "../interfaces/user.model.js";
import Users from "../repositories/user.repo.js";
import VerificationTokens from "../repositories/verification_tokens.repo.js";
import type { VerificationsTokenI } from "../interfaces/verification-tokens.model.js";
import bcrypt from "bcrypt";
import CONSTANTS from "../constants.js";
import sendVerificationCode from "../utils/nodeMailer/sendVerificationEmail.js";
import isValidEmail from "../utils/helperFuncs/isValidEmail.js";

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
    code: string
  ): Promise<ApiError | ApiResponse<null>> {
    if (!code || !email || code.length < 4) {
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
      const token: VerificationsTokenI = await VerificationTokens.getUserCode(
        user.id!
      );
      if (!token) {
        return new ApiError(
          404,
          "No code found. Please signup or send click resend token"
        );
      }

      if (token.used_at) {
        return new ApiResponse(201, null, "Email already verified");
      }

      const issuedAt = new Date(token.created_at).getTime();
      const expires = issuedAt + 300000;

      if (Date.now() > expires) {
        return new ApiError(400, "Token Expired");
      }

      const isTokenMatched = await bcrypt.compare(code, token.token_hash);

      if (!isTokenMatched) {
        return new ApiError(400, "Invalid code");
      }

      await Users.setUserVerified(user.id!, token.id);

      return new ApiResponse(201, null, "User verified successfully");
    } catch (error: any) {
      console.log("Error occured while verify user: ", error.message);
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
      console.log("Token Send to ", user.email, ": ", token);
      const token_hash = await bcrypt.hash(token, 10);
      await VerificationTokens.insert(user.id!, token_hash);

      return new ApiResponse(201, null, "Code send to email");
    } catch (error: any) {
      console.log("Error occured while resending code to user ", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const verifyUserServ = new VerifyUserService();

export default verifyUserServ;
