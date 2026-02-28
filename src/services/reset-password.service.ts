import Users from "../repositories/user.repo.js";
import isValidEmail from "../utils/helperFuncs/isValidEmail.js";
import sendPasswordResetEmail from "../utils/nodeMailer/sendPassResetEmail.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import CONSTANTS from "../constants.js";
import { passwordSchema } from "../utils/validations/schemas.js";

class ResetPasswordService {
  constructor() {}
  /**
   *
   * @param email
   * @returns
   */
  async requestPasswordReset(
    email: string
  ): Promise<ApiError | ApiResponse<null>> {
    if (!isValidEmail(email)) {
      return new ApiError(400, "Invalid email address");
    }
    try {
      const user = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      await sendPasswordResetEmail(email);

      return new ApiResponse(200, null, "Reset password link sent to email");
    } catch (error: any) {
      console.log(
        "Error sending reset password email to user: ",
        error.message
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
    confirmPassword: string
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
      return new ApiResponse(200, null, "Password reset successfull");
    } catch (error: any) {
      console.log(
        "Error sending reset password email to user: ",
        error.message
      );
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const resetPasswordServ = new ResetPasswordService();

export default resetPasswordServ;
