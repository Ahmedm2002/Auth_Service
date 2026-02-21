import type { Request, Response, NextFunction } from "express";
import ApiError from "../utils/responses/ApiError.js";
import jwt from "jsonwebtoken";

async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
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
    const docoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    console.log("User verified");
    next();
  } catch (error: any) {
    console.log("Error verify user's token: ", error.message);
    return res
      .status(500)
      .json(
        new ApiError(500, "Operation failed at our end. Please try again later")
      );
  }
}

export default authenticateUser;
