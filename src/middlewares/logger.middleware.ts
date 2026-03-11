import type CustomRequest from "../types/customReq.type.js";
import logger from "../utils/logger/logger.js";
import type { Response, NextFunction } from "express";
import crypto from "crypto";

const logRequest = (req: CustomRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  logger.info(
    { requestId, method: req.method, url: req.url },
    "Incoming request",
  );

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
      },
      "Request completed",
    );
  });

  next();
};

export default logRequest;
