import userSession from "../repositories/user_session.repo.js";
import type { userI } from "../models/user.model.js";
import type { userSessionI } from "../models/user-sessions.model.js";
import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import User from "../repositories/user.repo.js";
import bcrypt from "bcrypt";
import CONSTANTS from "../constants.js";
import crypto from "node:crypto";
import { generateTokens, type Tokens } from "../utils/jwt/generateTokens.js";

type LoginRes = ApiError | ApiResponse<userI & Tokens>;

class AuthService {
  constructor() {}
  async login(email: string, password: string): Promise<LoginRes> {
    try {
      const validate = loginSchema.safeParse({ email, password });
      if (!validate.success) {
        return new ApiError(400, "Invalid fields");
      }
      const user: userI = await User.getByEmail(email);
      if (!user) {
        new ApiError(404, "User not found");
      }

      const isPasswordValid: boolean = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return new ApiError(400, "Invalid credentials");
      }

      const deviceId = crypto.randomBytes(10).toString("hex");

      const { accessToken, refreshToken }: Tokens = generateTokens(user.id!);
      // TODO: Detect the user device type i.e mobile, browser etc
      const deviceType = "";
      await userSession.create(user.id!, deviceId, refreshToken, deviceType);

      return new ApiResponse<LoginRes>(200, {user, null}, "User saved successfully");
    } catch (error: any) {
      console.log("Error occured while login: ", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
  signup() {}
}

const authServ = new AuthService();

export default authServ as AuthService
