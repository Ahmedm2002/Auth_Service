// import jwt from "jsonwebtoken";

class VerificationsToken {
  constructor() {}
  async create(userId: string, email: string) {
    if (!userId || !email) return null;
  }
  verifyAcessToken(token: string) {}
  revokeAccessToken(refreshToken: string) {}
}

export default VerificationsToken;
