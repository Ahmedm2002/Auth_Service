import userSession from "../repositories/user_session.repo.js";
import type { userI } from "../interfaces/user.model.js";
import {
  loginSchema,
  signupSchema,
} from "../utils/validations/Zod/auth.schema.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import Users from "../repositories/user.repo.js";
import bcrypt from "bcrypt";
import CONSTANTS from "../constants.js";
import crypto from "node:crypto";
import { generateTokens } from "../utils/jwt/generateTokens.js";
import type { Tokens } from "../interfaces/tokens.model.js";
import safeUserParse from "../utils/dtoMapper/user.mapper.js";
import type { LoginResDto, SignupResDto } from "../dtos/auth/auth.dto.js";
import type { SafeUserDto } from "../dtos/user/user.dto.js";
import emaiVerification from "../repositories/verify_email.repo.js";
import sendVerificationCode from "../utils/nodeMailer/sendVerificationEmail.js";
import { fromError } from "zod-validation-error";
import logger from "../utils/logger/logger.js";
import { UAParser } from "ua-parser-js";
import type { DeviceInfo } from "../interfaces/user-sessions.model.js";
class AuthService {
  constructor() {}
  /**
   *
   * @param email
   * @param password
   * @returns
   */
  async login(
    email: string,
    password: string,
    userAgent: string,
  ): Promise<ApiError | ApiResponse<LoginResDto>> {
    if (!email || !password) {
      logger.warn("Empty value in fields");
      return new ApiError(400, "Email and Password required");
    }
    try {
      const validate = loginSchema.safeParse({ email, password });
      if (!validate.success) {
        const vaildationError = fromError(validate.error);
        return new ApiError(400, "Invalid fields", [vaildationError.message]);
      }
      const user: userI = await Users.getByEmail(email);
      if (!user) {
        return new ApiError(404, "User not found");
      }

      const isPasswordValid: boolean = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isPasswordValid) {
        return new ApiError(400, "Invalid credentials");
      }

      const deviceId: string = crypto.randomBytes(10).toString("hex");

      const { accessToken, refreshToken }: Tokens = generateTokens(user.id!);

      const parser = new UAParser(userAgent);
      const deviceInfo: DeviceInfo = {
        browser: parser.getBrowser().name || "",
        os: parser.getOS().name || "",
        device: parser.getDevice().type || "",
        vendor: parser.getDevice().vendor || "",
        model: parser.getDevice().model || "",
      };

      const refreshTokenHash = await bcrypt.hash(refreshToken, 5);
      const sessionId = await userSession.create(
        user.id!,
        deviceId,
        refreshTokenHash,
        deviceInfo,
      );

      if (!sessionId) {
        return new ApiError(
          500,
          "There was unexpected error creating your session. Try again later",
        );
      }
      const parsedUser: SafeUserDto = safeUserParse(user);

      return new ApiResponse<LoginResDto>(
        200,
        {
          user: parsedUser,
          accessToken,
          refreshToken,
          deviceId,
          sessionId: sessionId.id!,
        },
        "User saved successfully",
      );
    } catch (error: any) {
      logger.error({ err: error }, "Login failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }

  /**
   *
   * @param name
   * @param password
   * @param email
   * @returns
   */
  async signup(
    name: string,
    password: string,
    email: string,
  ): Promise<ApiError | ApiResponse<SignupResDto>> {
    if (!name || !password || !email) {
      return new ApiError(400, "Missing input fields");
    }
    try {
      const validate = signupSchema.safeParse({
        userName: name,
        password,
        email,
      });
      if (!validate.success) {
        let validationError = fromError(validate.error);
        return new ApiError(400, "Invalid inputs fields", [
          validationError.message,
        ]);
      }

      const existingUser: userI = await Users.getByEmail(email);
      if (existingUser) {
        return new ApiError(409, "Email already exists", []);
      }

      const password_hash = await bcrypt.hash(password, 10);
      const newUser: userI = await Users.createUser({
        name,
        email,
        password_hash,
      });
      // TODO: Implement the email sending using queues
      const token = await sendVerificationCode(email, name);
      const token_hash = await bcrypt.hash(token, 10);
      await emaiVerification.insert(newUser.id!, token_hash);
      const parsedUser: SafeUserDto = safeUserParse(newUser);
      return new ApiResponse<SignupResDto>(
        201,
        { user: parsedUser },
        "User created successfully",
      );
    } catch (error: any) {
      logger.error({ err: error }, "Signup failed unexpectedly");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const authServ = new AuthService();

export default authServ;
