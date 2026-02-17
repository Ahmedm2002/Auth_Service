import { pool } from "../configs/db.js";
import crypto from "node:crypto";
class UserSessions {
  constructor() {}
  async create(
    userId: string,
    deviceId: string,
    refreshToken: string
  ): Promise<string | null> {
    if (!userId || !deviceId || !refreshToken) {
      throw new Error("Missing required session fields");
    }

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    try {
      const result = await pool.query(
        `
        INSERT INTO user_sessions (user_id, device_id, expires_at, refresh_token)
        VALUES ($1, $2, now() + interval '7 days', $3)
        RETURNING id
        `,
        [userId, deviceId, refreshTokenHash]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      console.log(
        "Error occured while registering user session: ",
        error.message
      );
      throw new Error("Error while registering user session: ", error.message);
    }
  }
  async update(sessionId: string) {}
  async delete(sessionId: string): Promise<string[] | null> {
    if (!sessionId) throw new Error("Session id required");
    try {
      const result = await pool.query(
        "delete from user_session where id = $1",
        [sessionId]
      );
      return result[0].rows || null;
    } catch (error: any) {
      console.log("Error occured deleting user session: ", error.message);
      throw new Error("Error occured during deleting user session");
    }
  }

  async getAll(userId: string) {
    if (!userId) throw new Error("User id requied to get all user sessions");
    try {
      const session = await pool.query(
        "select * from user_sessions where user_id = $1",
        [userId]
      );
      return session[0];
    } catch (error: any) {
      console.log("Error getting users sessions: ", error.message);
      throw new Error("Error getting users sessions");
    }
  }
}

const userSession = new UserSessions();

export default userSession as UserSessions;
