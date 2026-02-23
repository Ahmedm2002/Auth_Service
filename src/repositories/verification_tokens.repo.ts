import { pool } from "../configs/db.js";
import type { QueryResult } from "pg";
import type { VerificationsTokenI } from "../models/verification-tokens.model.js";

/**
 *
 */
class VerificationsToken {
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
        "INSERT INTO email_verification_tokens (user_id, token_hash) VALUES ($1, $2) on conflict(user_id) do update set token_hash = $2 RETURNING id",
        [userId, token]
      );
      return response.rows[0] || null;
    } catch (error: any) {
      console.log(
        "Error while inserting token into verificationsTable",
        error.message
      );
      throw new Error("Error adding verification token");
    }
  }
  /**
   *
   * @param userId
   * @returns
   */
  async getUserCode(userId: string): Promise<VerificationsTokenI> {
    try {
      const result: QueryResult = await pool.query(
        "Select id, token_hash , used_at, created_at, revoked_at from email_verification_tokens where user_id = $1",
        [userId]
      );
      return result.rows[0];
    } catch (error) {
      console.log("Error while getting user's verification token");
      throw new Error("Error getting user code");
    }
  }
}

const verificationTokens = new VerificationsToken();

export default verificationTokens as VerificationsToken;
