import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import resetPasswordServ from "../services/reset-password.service.js";

/**
 *
 * @param req
 * @param res
 */
async function resetPassword(req: Request, res: Response) {
  const { email, password, confirmPassword } = req.body;
  try {
    const response = await resetPasswordServ.resetPassword(
      email,
      password,
      confirmPassword
    );
    res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error resetting user password: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function requestResetPassword(req: Request, res: Response) {
  const { email } = req.body;
  const response = await resetPasswordServ.requestPasswordReset(email);
  res.status(response.statusCode).json(response);
  try {
  } catch (error: any) {
    console.log(
      "Error occured while user requested for reset password: ",
      error.message
    );
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { resetPassword, requestResetPassword };
