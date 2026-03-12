import Users from "../repositories/user.repo.js";
import isValidEmail from "../utils/helperFuncs/isValidEmail.js";
import sendPasswordResetEmail from "../utils/nodeMailer/sendPassResetEmail.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import CONSTANTS from "../constants.js";
import { passwordSchema } from "../utils/validations/schemas.js";
import resetPassRepo from "../repositories/reset_password.repo.js";
import {
  generatePassResetTokens,
  isTokenHashMatched,
} from "../utils/helperFuncs/randomToken.js";
import bcrypt from "bcrypt";
import UserSession from "../repositories/user_session.repo.js";
import logger from "../utils/logger/logger.js";
class ResetPasswordService {
  constructor() {}
  /**
   *
   * @param email
   * @returns
   */
  async forgotPassword(email: string): Promise<ApiError | ApiResponse<null>> {
    // check if email is valid
    // lookup in db for user with the email
    // generate token and token_hash using helper function
    // store hash in db and send token to user
    // send email to user after saving token in database
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }
    try {
      const user = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      const { originalToken, encryptedToken } = generatePassResetTokens();
      const id = await resetPassRepo.insertToken(user.id, encryptedToken);
      if (!id) {
        return new ApiError(500, "Error generating reset password token");
      }
      // TODO : Blocking Code, Implement the email sending using queues
      await sendPasswordResetEmail(email, originalToken);

      return new ApiResponse(
        200,
        null,
        "If the email exists, a reset link has been sent.",
      );
    } catch (error: any) {
      logger.error({ err: error }, "Forgot password flow failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }

  /**
   *
   * @param email
   * @param password
   * @param confirmPassword
   * @returns
   */
  async resetPassword(
    email: string,
    password: string,
    confirmPassword: string,
    token: string,
  ): Promise<ApiError | ApiResponse<null>> {
    // get user generated reset password token from db
    // check its usage
    // check its expiry
    // set used_at to ensure on-time usage
    // invalidate all the previous sessions with old creds
    // set the new password has in the users table for updated password
    // redirect user to /login in frontend to login with new creds
    if (!email || !password || !confirmPassword) {
      return new ApiError(400, "Email and password required");
    }
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }

    if (password !== confirmPassword) {
      return new ApiError(400, "Password does not match");
    }
    try {
      const isPasswordValid = passwordSchema.safeParse(password);
      if (!isPasswordValid.success) {
        throw new ApiError(400, "Invalid Password");
      }
      const user = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      const resetToken = await resetPassRepo.getUserToken(user.id);
      if (!resetToken) {
        return new ApiError(404, "No active reset token found");
      }
      if (resetToken.used_at) {
        return new ApiError(400, "Token already used");
      }
      const currentTimeMS = Date.now();
      const tokenExpiryTimeMS = new Date(resetToken.expires_at).getTime();

      if (currentTimeMS > tokenExpiryTimeMS) {
        return new ApiError(400, "Reset Token Expired");
      }
      if (!isTokenHashMatched(token, resetToken.token_hash)) {
        return new ApiError(400, "Invalid Token");
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = await Users.updatePassword(user.id, hashedPassword);
      if (!id) {
        return new ApiError(500, CONSTANTS.SERVER_ERROR);
      }
      await resetPassRepo.setTokenUsedAt(resetToken.id);
      await UserSession.deleteAllSessions(user.id);
      return new ApiResponse(
        200,
        null,
        "Password reset successfull, Please Login again",
      );
    } catch (error: any) {
      logger.error({ err: error }, "Reset password flow failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const resetPasswordServ = new ResetPasswordService();

export default resetPasswordServ;
