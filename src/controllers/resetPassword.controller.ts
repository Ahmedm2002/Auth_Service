import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import resetPasswordServ from "../services/reset-password.service.js";
import logger from "../utils/logger/logger.js";

/**
 *
 * @param req
 * @param res
 */
async function resetPassword(req: Request, res: Response) {
  const { email, password, confirmPassword, token } = req.body;
  try {
    const response = await resetPasswordServ.resetPassword(
      email,
      password,
      confirmPassword,
      token,
    );
    res.status(response.statusCode).json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Reset password failed unexpectedly");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  try {
    const response = await resetPasswordServ.forgotPassword(email);
    res.status(response.statusCode).json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Forgot password request failed unexpectedly");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { resetPassword, forgotPassword };
