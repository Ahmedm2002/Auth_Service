import type { Response, Request } from "express";
import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";
async function loginUser(req: Request, res: Response): Promise<any> {
  try {
    const validate = loginSchema.parse(req.body);
    console.log("Validation: ", validate);

    return res.status(200).json({});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

async function signupUser(req: Request, res: Response): Promise<any> {
  try {
    const validate = signupSchema.parse(req.body);
    return res.status(200).json({});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

export { loginUser, signupUser };
