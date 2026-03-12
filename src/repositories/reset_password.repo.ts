import { pool } from "../configs/db.js";
import type { QueryResult } from "pg";
import type { PasswordResetI } from "../interfaces/password-reset.model.js";

class ResetPasswordRepo {
  constructor() {}
  async insertToken(userId: string, tokenHash: string): Promise<string> {
    try {
      const response: QueryResult = await pool.query(
        "Insert into password_recovery_tokens (user_id, token_hash, expires_at) values ($1, $2, NOW() + INTERVAL '5 min') on conflict(user_id) do update set token_hash = $2, expires_at = NOW() + INTERVAL '5 min'  returning id",
        [userId, tokenHash],
      );
      return response.rows[0];
    } catch (error: any) {
      throw new Error(
        "Error inserting token for password recovery token table",
      );
    }
  }
  async setTokenUsedAt(tokenId: string): Promise<string> {
    try {
      const response: QueryResult = await pool.query(
        "Update password_recovery_tokens set used_at = NOW() where id = $1 AND expires_at is not null returning id",
        [tokenId],
      );
      return response.rows[0];
    } catch (error: any) {
      throw new Error("Error updating token for password recovery token table");
    }
  }
  /**
   *
   * @param userId
   * @returns
   */
  async getUserToken(userId: string): Promise<PasswordResetI> {
    try {
      const response: QueryResult = await pool.query(
        "Select token_hash, used_at, expires_at, user_id from password_recovery_tokens where user_id = $1",
        [userId],
      );
      return response.rows[0];
    } catch (error) {
      throw new Error("Error retrieving user password recovery token");
    }
  }
}

const resetPassRepo = new ResetPasswordRepo();

export default resetPassRepo;
