import type { Response, Request } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import authServ from "../services/auth.service.js";

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function loginUser(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body;
  try {
    const response = await authServ.login(email, password);

    return res
      .status(response.statusCode)
      .cookie("accessToken", response.data?.accessToken, CONSTANTS.cookieOpts)
      .cookie("refreshToken", response.data?.refreshToken, CONSTANTS.cookieOpts)
      .cookie("deviceId", response.data?.deviceId, CONSTANTS.cookieOpts)
      .json(response);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function signupUser(req: Request, res: Response): Promise<Response> {
  const { name, password, email } = req.body;
  try {
    const response = await authServ.signup(name, password, email);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { loginUser, signupUser };
