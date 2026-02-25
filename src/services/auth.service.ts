import userSession from "../repositories/user_session.repo.js";
import type { userI } from "../interfaces/user.model.js";
import type { userSessionI } from "../interfaces/user-sessions.model.js";
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
import generateTokens from "../utils/jwt/generateTokens.js";
import type { Tokens } from "../interfaces/tokens.model.js";
import safeUserParse from "../utils/dtoMapper/user.mapper.js";
import type { LoginResDto } from "../dtos/auth/auth.dto.js";
import type { SafeUserDto } from "../dtos/user/user.dto.js";
class AuthService {
  constructor() {}
  async login(
    email: string,
    password: string
  ): Promise<ApiError | ApiResponse<LoginResDto>> {
    try {
      const validate = loginSchema.safeParse({ email, password });
      if (!validate.success) {
        return new ApiError(400, "Invalid fields");
      }
      const user: userI = await User.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }

      const isPasswordValid: boolean = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return new ApiError(400, "Invalid credentials");
      }

      const deviceId: string = crypto.randomBytes(10).toString("hex");

      const { accessToken, refreshToken }: Tokens = generateTokens(user.id!);
      // TODO: Detect the user device type i.e mobile, browser etc
      const deviceType = "";
      const sessionId = await userSession.create(
        user.id!,
        deviceId,
        refreshToken,
        deviceType
      );

      if (!sessionId) {
        return new ApiError(
          500,
          "There was unexpected error creating your session. Try again later"
        );
      }
      const parsedUser: SafeUserDto = safeUserParse(user);

      return new ApiResponse<LoginResDto>(
        200,
        { user: parsedUser, accessToken, refreshToken, deviceId },
        "User saved successfully"
      );
    } catch (error: any) {
      console.log("Error occured while login: ", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
  async signup(
    name: string,
    password: string,
    email: string
  ): Promise<ApiError | ApiResponse<SignupResDto>> {
    try {
      return new ApiResponse(200, {});
    } catch (error: any) {
      console.log("Error occured while signup: ", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const authServ = new AuthService();

export default authServ;
