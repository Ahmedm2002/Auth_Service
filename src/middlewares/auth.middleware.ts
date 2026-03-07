import type { Response, NextFunction } from "express";
import ApiError from "../utils/responses/ApiError.js";
import * as jwt from "jsonwebtoken";
import CONSTANTS from "../constants.js";
import type CustomRequest from "../types/customReq.type.js";

async function authenticateUser(
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers?.["authorization"] || null;

  if (!authHeader) {
    return res.status(400).json(new ApiError(400, "Auth headers missing"));
  }
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json(new ApiError(401, "Access token required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    console.log("User verified", decoded);
    next();
    req.user = decoded as { id: string };
  } catch (error: any) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json(new ApiError(401, "Token expired"));
    }
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export default authenticateUser;
