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
  verifyAcessToken(token: string) {}
  revokeAccessToken(refreshToken: string) {}
}

const verificationTokens = new VerificationsToken();

export default verificationTokens as VerificationsToken;
