import userSession from "../repositories/user_session.repo.js";
import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import CONSTANTS from "../constants.js";
import type { userSessionI } from "../models/user-sessions.model.js";

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function getAllSessions(req: Request, res: Response) {
  const userId = req.query.userId as string;
  if (!userId)
    return res.status(400).json(new ApiError(400, "User id required"));
  try {
    const sessions: userSessionI[] = await userSession.getAll(userId);
    if (sessions.length === 0) {
      return res.status(404).json(new ApiError(404, "No user session found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, sessions, "sessions fetched successfully"));
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
  console.log("req.body: ", req.body);
  const { sessionId, deviceId } = req.body;
  if (!sessionId || !deviceId) {
    return res.status(400).json(new ApiError(400, "Required fields missing"));
  }

  try {
    const id: string = await userSession.deleteUserSession(sessionId);
    if (!id) {
    }
    return res.status(200).json(new ApiResponse(200, id, "Logout successfull"));
  } catch (error: any) {
    console.log("Error invalidating user session: ", error?.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { getAllSessions, invalidateSession };
