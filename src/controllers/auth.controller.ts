import type { Response, Request } from "express";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import Users from "../repositories/user.repo.js";
import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";
import bcrypt from "bcrypt";
import sendVerificationLink from "../services/nodeMailer/sendEmail.js";
import verificationTokens from "../repositories/verification_tokens.repo.js";

async function loginUser(req: Request, res: Response): Promise<any> {
  const { email, password } = req.body;
  try {
    const validate = loginSchema.safeParse(req.body);
    if (!validate.success) {
      return res
        .status(400)
        .json(new ApiError(400, "Validation failed", validate.error.issues));
    }
    return res.status(200).json({});
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await Users.getAllUsers();
    if (users) {
      return res
        .status(200)
        .json(new ApiResponse(200, users, "Users fetched successfully"));
    }
    return res.status(200).json(new ApiResponse(200));
  } catch (error) {}
}

async function signupUser(req: Request, res: Response): Promise<any> {
  const { name, password, email } = req.body;
  try {
    const validate = signupSchema.safeParse({ userName: name, ...req.body });
    if (!validate.success) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid inputs fields", ["Invalid fields"]));
    }

    const existingUser = await Users.getByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .json(new ApiError(409, "Email already exists", []));
    }
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await Users.createUser({
      name,
      email,
      password_hash,
    });
    if (newUser) {
      // generate an email for email verification
      // this is blocking code and increases latency for the signup api this should be added to a separate service for sending emails and not blocking the signup api flow
      const token = await sendVerificationLink(email, name);
      const token_hash = await bcrypt.hash(token, 10);
      await verificationTokens.insert(newUser.id, token_hash);

      return res
        .status(200)
        .json(new ApiResponse(200, newUser, "User created successfully"));
    }
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({});
  }
}

export { loginUser, signupUser, getAllUsers };
