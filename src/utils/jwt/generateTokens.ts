import jwt from "jsonwebtoken";
import type { Tokens } from "../../interfaces/tokens.model.js";

/**
 *
 * @param userId
 * @returns
 */
function generateTokens(userId: string): Tokens {
  if (!userId) {
    throw new Error("User id required");
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not configured");
  }

  const accessToken = jwt.sign(
    {
      sub: userId,
      type: "access",
    },
    accessSecret,
    {
      expiresIn: "15m",
      issuer: "auth-service",
      audience: "user",
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: userId,
      type: "refresh",
    },
    refreshSecret,
    {
      expiresIn: "7d",
      issuer: "auth-service",
      audience: "user",
    }
  );

  return { accessToken, refreshToken };
}

function generateAccessToken(userId: string): string {
  const accessSecret = process.env.JWT_ACCESS_SECRET!;
  const accessToken = jwt.sign(
    {
      sub: userId,
      type: "access",
    },
    accessSecret,
    {
      expiresIn: "15m",
      issuer: "auth-service",
      audience: "user",
    }
  );
  return accessToken;
}

export { generateTokens, generateAccessToken };
