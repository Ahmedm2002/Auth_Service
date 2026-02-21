import userSession from "../repositories/user_session.repo.js";
import type { Request, Response } from "express";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";

async function getAllSessions(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!userId)
    return res.status(400).json(new ApiError(400, "User id required"));
  try {
    const sessions = await userSession.getAll(userId);
    if (!sessions)
      res.status(404).json(new ApiError(404, "No user session found"));

    res
      .status(200)
      .json(new ApiResponse(200, sessions, "sessions fetched successfully"));
  } catch (error: any) {
    console.log("Error getting user sessions", error.message);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Something went wrong on our end. Please try again later"
        )
      );
  }
}

export { getAllSessions };
