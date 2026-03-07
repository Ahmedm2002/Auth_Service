import type { Request } from "express";

export default interface CustomRequest extends Request {
  user?: {
    id: string;
  };
  requestId?: string;
}
