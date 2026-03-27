import { pool } from "../configs/db.js";
import type { QueryResult } from "pg";
import type { EmailVerificationI } from "../interfaces/email-verification.model.js";
import logger from "../utils/logger/logger.js";

/**
 *
 */
class EmailVerificationRepo {
  constructor() {}
  /**
   *
   * @param userId
   * @param token
   * @returns
   */
  async insert(userId: string, token: string): Promise<string | null> {
    if (!userId || !token) throw new Error("Token and user id are missing");

    try {
      const response: QueryResult = await pool.query(
        "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 min') on conflict(user_id) do update set token_hash = $2, revoked_at = NOW(), expires_at = NOW() + INTERVAL '5 min' RETURNING id",
        [userId, token],
      );
      return response.rows[0] || null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to insert verification token");
      throw new Error("Error adding verification token");
    }
  }
  /**
   *
   * @param userId
   * @returns
   */
  async getUserCode(userId: string): Promise<EmailVerificationI> {
    try {
      const result: QueryResult = await pool.query(
        "Select id, token_hash , used_at, created_at, revoked_at, expires_at from email_verification_tokens where user_id = $1",
        [userId],
      );
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, "Failed to retrieve verification token");
      throw new Error("Error getting user code");
    }
  }
}

const emaiVerification = new EmailVerificationRepo();

export default emaiVerification;
