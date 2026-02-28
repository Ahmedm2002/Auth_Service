import CONSTANTS from "../constants.js";
import Users from "../repositories/user.repo.js";
import isValidUuid from "../utils/helperFuncs/isValidUuid.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import UserSession from "../repositories/user_session.repo.js";
import bcrpty from "bcrypt";
import { generateAccessToken } from "../utils/jwt/generateTokens.js";

type AccessToken = { accessToken: string };
class Tokens {
  constructor() {}
  async generateAccessToken(
    refreshToken: string,
    userId: string,
    deviceId: string,
    sessionId: string
  ): Promise<ApiError | ApiResponse<AccessToken>> {
    if (!refreshToken || !userId || !deviceId || !sessionId) {
      return new ApiError(400, "Bad Request, Required fields are empty");
    }
    if (!isValidUuid(userId)) {
      return new ApiError(400, "Invalid user id");
    }
    try {
      // check if user exists
      const user = await Users.getById(userId);
      if (!user) {
        return new ApiError(404, "User not found");
      }
      // retrieve its token by device id and user id
      const session = await UserSession.getSession(userId, sessionId);
      // check if th session exists
      if (!session) {
        return new ApiError(404, "No session found");
      }
      // check if the refresh token has not expired
      const currentTime = Date.now();
      // if()
      // compare refre  sh token hash
      const isValidToken = await bcrpty.compare(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      );

      if (!isValidToken) {
        return new ApiError(400, "Invalid refresh Token");
      }
      // generate new access token
      const token = generateAccessToken(userId);

      // send it to user

      return new ApiResponse<AccessToken>(
        200,
        { accessToken: token },
        "Access token generated successfully"
      );
    } catch (error: any) {
      console.log("Error occured while generated new access token for user");
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const tokensServ = new Tokens();

export default tokensServ;
