import type { Response, NextFunction } from "express";
import ApiError from "../utils/responses/ApiError.js";
import jwt from "jsonwebtoken";
import CONSTANTS from "../constants.js";
import type CustomRequest from "../types/customReq.type.js";
import logger from "../utils/logger/logger.js";
import { UAParser } from "ua-parser-js";

async function authenticateUser(
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers?.["authorization"] || null;

  if (!authHeader) {
    return res.status(400).json(new ApiError(400, "Auth headers missing"));
  }
  const token = authHeader && authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json(new ApiError(401, "Access token required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    next();
    req.user = { id: decoded.sub as string };
    req.deviceInfo = new UAParser(req.headers["user-agent"] || "");
    console.log(req.deviceInfo);
  } catch (error: any) {
    const { JsonWebTokenError, TokenExpiredError } = jwt;
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError
    ) {
      return res.status(401).json(new ApiError(401, "Token expired"));
    }
    logger.fatal("Auth Middleware unhandleled scenario", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export default authenticateUser;
