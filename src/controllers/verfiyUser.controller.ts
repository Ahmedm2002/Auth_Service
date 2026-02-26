import ApiError from "../utils/responses/ApiError.js";
import type { Request, Response } from "express";
import CONSTANTS from "../constants.js";
import verifyUserServ from "../services/verify-user.service.js";

async function verifyEmail(req: Request, res: Response) {
  const { code, email } = req.body;
  try {
    const response = await verifyUserServ.verifyEmail(email, code);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error occured while verifying email: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

async function resendCode(req: Request, res: Response) {
  const { email } = req.body;
  try {
    const response = await verifyUserServ.resendCode(email);
    res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error while resending user's code : ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { verifyEmail, resendCode };
