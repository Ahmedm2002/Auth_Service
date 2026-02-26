import CONSTANTS from "../constants.js";
import type { userSessionI } from "../interfaces/user-sessions.model.js";
import UserSession from "../repositories/user_session.repo.js";
import ApiError from "../utils/responses/ApiError.js";
import ApiResponse from "../utils/responses/ApiResponse.js";
import isValidUuid from "../utils/helperFuncs/isValidUuid.js";
class UserSessionService {
  constructor() {}
  /**
   *
   * @param userId
   * @returns
   */
  async getAllSessions(userId: string): Promise<ApiError | ApiResponse<any>> {
    if (!userId) return new ApiError(400, "User id required");
    if (!isValidUuid(userId)) {
      return new ApiError(400, "Invalid user id");
    }
    try {
      const sessions: userSessionI[] = await UserSession.getAll(userId);
      if (sessions.length === 0) {
        return new ApiError(404, "No user session found");
      }
      return new ApiResponse<any>(
        200,
        sessions,
        "sessions fetched successfully"
      );
    } catch (error: any) {
      console.log("Error getting user sessions", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
  async invalidateSession(
    sessionId: string,
    deviceId: string
  ): Promise<ApiError | ApiResponse<string>> {
    if (!sessionId || !deviceId) {
      return new ApiError(400, "Required fields missing");
    }
    if (!isValidUuid(sessionId)) {
      return new ApiError(400, "Invalid user id");
    }
    try {
      const id: string = await UserSession.deleteUserSession(
        sessionId,
        deviceId
      );
      if (!id) {
        return new ApiError(400, "No session found");
      }
      return new ApiResponse<string>(200, id, "Session deleted successfully");
    } catch (error: any) {
      console.log("Error deleting user sessions", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }

  async deleteAllSessions(
    userId: string
  ): Promise<ApiError | ApiResponse<string[]>> {
    if (!isValidUuid(userId)) {
      return new ApiError(400, "Invalid user id");
    }
    try {
      const deletedSessions = await UserSession.deleteAllSessions(userId);
      if (deletedSessions.length <= 0) {
        return new ApiError(404, "No active user sessions found");
      }
      return new ApiResponse<string[]>(
        200,
        deletedSessions,
        "Log out from all devices sucessfull"
      );
    } catch (error: any) {
      console.log("Error deletin all user sessions", error.message);
      return new ApiError(500, CONSTANTS.SERVER_ERROR);
    }
  }
}

const userSessionServ = new UserSessionService();

export default userSessionServ;
