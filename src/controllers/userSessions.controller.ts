import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import CONSTANTS from "../constants.js";
import userSessionServ from "../services/user-session.service.js";
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
    console.log("Error getting user sessions", error.message);
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
      deviceId
    );
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error invalidating user session: ", error?.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

async function logOutAllDevices(req: Request, res: Response) {
  const { userId } = req.body;
  try {
    const response = await userSessionServ.deleteAllSessions(userId);
    return res.status(response.statusCode).json(response);
  } catch (error: any) {
    console.log("Error invalidating user session: ", error?.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { getAllSessions, invalidateSession, logOutAllDevices };
