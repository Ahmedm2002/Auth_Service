import type { Request, Response } from "express";
import healthServ from "../services/health.service.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import ApiError from "../utils/responses/ApiError.js";

/**
 * @desc Get application health and database status
 * @route GET /api/v1/health
 * @access Public
 */
const healthCheck = async (req: Request, res: Response) => {
  const result = await healthServ.serverHealth();
  
  if (result instanceof ApiError) {
    return res.status(result.statusCode).json(result);
  }
  
  return res.status(result.statusCode).json(result);
};

export { healthCheck };
