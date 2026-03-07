import type CustomRequest from "../types/customReq.type.js";
import logger from "../utils/logger/logger.js";
import type { Response, NextFunction } from "express";
import crypto from "crypto";

const logRequest = (req: CustomRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().toString();
  req.requestId = requestId;
  logger.info(`Request ID: ${requestId} - ${req.method} ${req.url}`);
  req.on("close", () => {
    const duration = Date.now() - startTime;
    logger.info(
      `Request ID: ${requestId} - ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
    );
  });
  next();
};

export default logRequest;
