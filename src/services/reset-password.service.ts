import Users from "../repositories/user.repo.js";
import isValidEmail from "../utils/helperFuncs/isValidEmail.js";
import sendPasswordResetEmail from "../utils/nodeMailer/sendPassResetEmail.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import CONSTANTS from "../constants.js";
import { passwordSchema } from "../utils/validations/schemas.js";
import resetPassRepo from "../repositories/reset_password.repo.js";
import { generatePassResetTokens } from "../utils/helperFuncs/randomToken.js";
class ResetPasswordService {
  constructor() {}
  /**
   *
   * @param email
   * @returns
   */
  async forgotPassword(email: string): Promise<ApiError | ApiResponse<null>> {
    // check if email is valid

    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }
    try {
      // lookup in db for user with the email
      const user = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      // generate token and token_hash using helper function
      const { originalToken, encryptedToken } = generatePassResetTokens();
      // store hash in db and send token to user
      const id = await resetPassRepo.insertToken(user.id, encryptedToken);
      if (!id) {
        return new ApiError(500, "Error generating reset password token");
      }
      // send email to user after saving token in database
      await sendPasswordResetEmail(email, originalToken);

      return new ApiResponse(200, null, "Reset password link sent to email");
    } catch (error: any) {
      console.log(
        "Error sending reset password email to user: ",
        error.message,
      );
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
  ): Promise<ApiError | ApiResponse<null>> {
    if (!email || !password || !confirmPassword) {
      return new ApiError(400, "Email and password required");
    }
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invlaid email address");
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

      // get user generated reset password token from db
      // check its expiry
      // set used_at to ensure on-time usage
      // invalidate all the previous sessions with old creds
      // set the new password has in the users table for updated password
      // redirect user to /login in frontend to login with new creds
      return new ApiResponse(200, null, "Password reset successfull");
    } catch (error: any) {
      console.log(
        "Error sending reset password email to user: ",
        error.message,
      );
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const resetPasswordServ = new ResetPasswordService();

export default resetPasswordServ;
