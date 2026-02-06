import { pool } from "../configs/db.js";

class VerificationsToken {
  constructor() {}
  async insert(userId: string, token: string) {
    if (!userId || !token) return null;
    try {
      const response = await pool.query(
        "INSERT INTO email_verification_tokens (user_id, token_hash) VALUES ($1, $2) RETURNING id",
        [userId, token]
      );
      return response.rows[0];
    } catch (error: any) {
      console.log(
        "Error while inserting token into verificationsTable",
        error.message
      );
    }
  }

  async getUserCode(userId: string) {
    if (!userId) return;
    try {
      const result = await pool.query(
        "Select token_hash , used_at, created_at, revoked_at from email_verification_tokens where user_id = $1",
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.log("Error while getting user's verification token");
      return null;
    }
  }
  verifyAcessToken(token: string) {}
  revokeAccessToken(refreshToken: string) {}
}

const verificationTokens = new VerificationsToken();

export default verificationTokens as VerificationsToken;
