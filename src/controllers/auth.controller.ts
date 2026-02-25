import type { Response, Request } from "express";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import Users from "../repositories/user.repo.js";
import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";
import bcrypt from "bcrypt";
import sendVerificationCode from "../utils/nodeMailer/sendVerificationEmail.js";
import verificationTokens from "../repositories/verification_tokens.repo.js";
import crypto from "node:crypto";
import userSession from "../repositories/user_session.repo.js";
import { generateTokens } from "../utils/jwt/generateTokens.js";
import CONSTANTS from "../constants.js";
import type { userI } from "../models/user.model.js";

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function loginUser(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body;
  try {
    const validate = loginSchema.safeParse(req.body);
    if (!validate.success) {
      return res
        .status(400)
        .json(new ApiError(400, "Validation failed", validate.error.issues));
    }
    const user: userI = await Users.getByEmail(email);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json(new ApiError(400, "Invalid credentials"));
    }
    const deviceId = crypto.randomBytes(10).toString("hex");
    // TODO: Detect the user device type i.e mobile, browser etc
    const deviceType = "";
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = generateTokens(user.id!);
    await userSession.create(user.id!, deviceId, refreshToken, deviceType);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, {
          user: {
            name: user.name,
            email: user.email,
            profile_picture: user.profile_picture,
            id: user.id,
            verified_at: user.verified_at,
            accessToken,
          },
          deviceId,
        })
      );
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function getAllUsers(req: Request, res: Response): Promise<Response> {
  try {
    const users: userI[] = await Users.getAllUsers();
    if (users?.length === 0) {
      return res.status(200).json(new ApiResponse(200, "No users found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, users, "Users fetched successfully"));
  } catch (error: any) {
    console.log("Error getting all users: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

/**
 *
 * @param req
 * @param res
 * @returns
 */
async function signupUser(req: Request, res: Response): Promise<Response> {
  const { name, password, email } = req.body;
  try {
    const validate = signupSchema.safeParse({
      userName: name,
      ...req.body,
    });
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
    const newUser: userI = await Users.createUser({
      name,
      email,
      password_hash,
    });

    // generate an email for email verification
    // this is blocking code and increases latency for the signup api this should be added to a separate service for sending emails and not blocking the signup api flow
    const token = await sendVerificationCode(email, name);
    console.log("Token Send to ", newUser.email, ": ", token);
    const token_hash = await bcrypt.hash(token, 10);
    await verificationTokens.insert(newUser.id!, token_hash);

    return res
      .status(200)
      .json(new ApiResponse(200, newUser, "User created successfully"));
  } catch (error: any) {
    console.log("Error: ", error.message);
    return res.status(500).json(new ApiError(500, CONSTANTS.SERVER_ERROR));
  }
}

export { loginUser, signupUser, getAllUsers };
