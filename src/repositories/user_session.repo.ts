import type { QueryResult } from "pg";
import { pool } from "../configs/db.js";
import crypto from "node:crypto";
import type { userSessionI } from "../interfaces/user-sessions.model.js";
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
   * @returns
   */
  async create(
    userId: string,
    deviceId: string,
    refreshToken: string,
    deviceType: string
  ): Promise<Pick<userSessionI, "id"> | null> {
    if (!userId || !deviceId || !refreshToken) {
      throw new Error("Missing required session fields");
    }

    // Hash the referesh token and save to database
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    try {
      const result: QueryResult<userSessionI> = await pool.query(
        `
        INSERT INTO user_sessions (user_id, device_id, expires_at, refresh_token, device_type)
        VALUES ($1, $2, now() + interval '7 days', $3, $4)
        RETURNING id
        `,
        [userId, deviceId, refreshTokenHash, deviceType]
      );

      return result.rows[0] ?? null;
    } catch (error: any) {
      console.log(
        "Error occured while registering user session: ",
        error.message
      );
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
        "delete from user_sessions where id = $1 returning id",
        [userId]
      );
      return result.rows;
    } catch (error: any) {
      console.log("Error occured deleting user session: ", error.message);
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
        "select * from user_sessions where user_id = $1",
        [userId]
      );
      return session.rows ?? null;
    } catch (error: any) {
      console.log("Error getting users sessions: ", error.message);
      throw new Error("Error getting users sessions");
    }
  }

  async deleteUserSession(
    sessionId: string,
    deviceId: string
  ): Promise<string> {
    try {
      const result: QueryResult = await pool.query(
        "Delete from user_sessions where id = $1 and device_id = $2 returning id",
        [sessionId, deviceId]
      );
      return result.rows[0];
    } catch (error: any) {
      console.log("Error deleting user session");
      throw new Error("Error deleting user session");
    }
  }
}

const UserSession = new UserSessionsRepo();

export default UserSession;
