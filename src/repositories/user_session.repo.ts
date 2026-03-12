import type { QueryResult } from "pg";
import { pool } from "../configs/db.js";
import crypto from "node:crypto";
import type { userSessionI, DeviceInfo } from "../interfaces/user-sessions.model.js";
import logger from "../utils/logger/logger.js";
/**
 *
 */
class UserSessionsRepo {
  constructor() {}
  /**
   *
   * @param userId
   * @param deviceId
   * @param refreshToken
   * @param deviceType
   * @returns
   */
  async create(
    userId: string,
    deviceId: string,
    refreshTokenHash: string,
    deviceType: DeviceInfo,
  ): Promise<Pick<userSessionI, "id"> | null> {
    if (!userId || !deviceId || !refreshTokenHash) {
      throw new Error("Missing required session fields");
    }

    try {
      const result: QueryResult<userSessionI> = await pool.query(
        `
        INSERT INTO user_sessions (user_id, device_id, expires_at, refresh_token, device_type)
        VALUES ($1, $2, now() + interval '7 days', $3, $4)
        RETURNING id
        `,
        [userId, deviceId, refreshTokenHash, deviceType],
      );

      return result.rows[0] ?? null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to create user session");
      throw new Error("Error while registering user session: ", error.message);
    }
  }
  /**
   *
   * @param userId
   * @returns
   */
  async deleteAllSessions(userId: string): Promise<string[]> {
    try {
      const result: QueryResult = await pool.query(
        "delete from user_sessions where user_id = $1 returning id",
        [userId],
      );
      return result.rows;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to delete all user sessions");
      throw new Error("Error occured during deleting user session");
    }
  }

  /**
   *
   * @param userId
   * @returns
   */
  async getAll(userId: string): Promise<userSessionI[]> {
    try {
      const session: QueryResult<userSessionI> = await pool.query(
        "select * from user_sessions where user_id = $1 and expires_at > NOW()",
        [userId],
      );
      return session.rows ?? null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get all user sessions");
      throw new Error("Error getting users sessions");
    }
  }

  async deleteUserSession(
    sessionId: string,
    deviceId: string,
  ): Promise<string> {
    try {
      const result: QueryResult = await pool.query(
        "Delete from user_sessions where id = $1 and device_id = $2 returning id",
        [sessionId, deviceId],
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error({ err: error }, "Failed to delete user session");
      throw new Error("Error deleting user session");
    }
  }
  async getSession(userId: string, sessionId: string): Promise<userSessionI> {
    try {
      const session: QueryResult = await pool.query(
        "SELECT id, user_id, refresh_token, expires_at, device_id, device_type FROM user_sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId],
      );
      return session.rows[0];
    } catch (error: any) {
      logger.error({ err: error }, "Failed to retrieve user session");
      throw new Error("Error retreiveng user session");
    }
  }
}

const UserSession = new UserSessionsRepo();

export default UserSession;
