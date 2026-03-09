import type { Request } from "express";
import type { UAParser } from "ua-parser-js";

export default interface CustomRequest extends Request {
  user?: {
    id: string;
  };
  requestId?: string;
  deviceInfo?: any;
}
