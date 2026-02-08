import { pool } from "../configs/db.js";
import crypto from "node:crypto";
class UserSessions {
  constructor() {}
  async create(userId: string, deviceId: string, refreshToken: string) {
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
      return null;
    }
  }
  async update(sessionId: string) {}
  async delete(sessionId: string) {}
  async getById(sessionId: string) {}
  async getAll(userId: string) {}
}

const userSession = new UserSessions();

export default userSession as UserSessions;
