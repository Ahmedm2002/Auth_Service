import CONSTANTS from "../constants.js";
import Users from "../repositories/user.repo.js";
import isValidUuid from "../utils/helperFuncs/isValidUuid.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import UserSession from "../repositories/user_session.repo.js";
import bcrypt from "bcrypt";
import { generateAccessToken } from "../utils/jwt/generateTokens.js";
import logger from "../utils/logger/logger.js";

type AccessToken = { accessToken: string };
class Tokens {
  constructor() {}
  /**
   *
   * @param refreshToken
   * @param userId
   * @param deviceId
   * @param sessionId
   * @returns
   */
  async generateAccessToken(
    refreshToken: string,
    userId: string,
    deviceId: string,
    sessionId: string,
  ): Promise<ApiError | ApiResponse<AccessToken>> {
    // Implemented
    // check all fields are in the body
    // is uuid valid check
    // check if user exists
    // retrieve its token by device id and user id
    // check if the session exists
    // check if the refresh token has not expired
    // compare refresh token hash in the db
    // generate new access token
    // send new access token to user

    if (!refreshToken || !userId || !deviceId || !sessionId) {
      return new ApiError(400, "Bad Request, Required fields are empty");
    }
    if (!isValidUuid(userId)) {
      return new ApiError(400, "Invalid user id");
    }
    try {
      const user = await Users.getById(userId);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      const session = await UserSession.getSession(userId, sessionId);
      if (!session) {
        return new ApiError(404, "No session found");
      }
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      const currentTimeMS = Date.now();
      const tokenExpiryDateMS = new Date(session.expires_at!).getTime();
      if (currentTimeMS > tokenExpiryDateMS) {
        return new ApiError(400, "Refresh token expired");
      }

      const isValidToken = await bcrypt.compare(
        refreshToken,
        session.refresh_token!,
      );
      if (!isValidToken) {
        return new ApiError(400, "Invalid refresh Token");
      }
      const token = generateAccessToken(userId);

      return new ApiResponse<AccessToken>(
        200,
        { accessToken: token },
        "Access token generated successfully",
      );
    } catch (error: any) {
      logger.error({ err: error }, "Failed to generate access token");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const tokensServ = new Tokens();

export default tokensServ;
