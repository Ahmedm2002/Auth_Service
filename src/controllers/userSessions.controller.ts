import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import userSessionServ from "../services/user-session.service.js";
import tokensServ from "../services/tokens.service.js";
import logger from "../utils/logger/logger.js";
import type CustomRequest from "../types/customReq.type.js";
/**
 *
 * @param req
 * @param res
 * @returns
 */
async function getAllSessions(req: Request, res: Response) {
  const userId = req.query.userId as string;
  try {
    const response = await userSessionServ.getAllSessions(userId);
    res.status(response.statusCode).json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch user sessions");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 */
async function invalidateSession(req: Request, res: Response) {
  const { sessionId, deviceId } = req.body;

  try {
    const response = await userSessionServ.invalidateSession(
      sessionId,
      deviceId,
    );
    return res
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .clearCookie("deviceId")
      .status(response.statusCode)
      .json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to invalidate session");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

async function logOutAllDevices(req: CustomRequest, res: Response) {
  const userId = req?.user?.id;
  try {
    const response = await userSessionServ.deleteAllSessions(userId!);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to log out all devices");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

async function getAccessToken(req: Request, res: Response) {
  const { refreshToken, userId, deviceId, sessionId } = req.body;
  try {
    const response = await tokensServ.generateAccessToken(
      refreshToken,
      userId,
      deviceId,
      sessionId,
    );
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    logger.error({ err: error }, "Failed to generate access token");
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { getAllSessions, invalidateSession, getAccessToken, logOutAllDevices };
