// import jwt from "jsonwebtoken";

class VerificationsToken {
  constructor() {}
  // const token = jwt.sign()
  async createTokens(userId: string, email: string) {
    if (!userId || !email) return null;
  }
  verifyAcessToken(token: string) {}
  revokeAccessToken(refreshToken: string) {}
}
