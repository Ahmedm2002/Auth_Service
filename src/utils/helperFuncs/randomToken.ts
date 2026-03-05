import crypto from "node:crypto";
type Token = {
  originalToken: string;
  encryptedToken: string;
};
function generatePassResetTokens(): Token {
  const originalToken = crypto.randomBytes(32).toString("hex");
  const encryptedToken = crypto
    .createHash("sha256")
    .update(originalToken)
    .digest("hex");
  return { originalToken, encryptedToken };
}

function isTokenHashMatched(token: string, tokenHash: string): boolean {
  // create hash of the token provided
  // compare it wiht the hash previously created
  // if matches its a valid token else invalid token

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  if (hashedToken !== tokenHash) return false;
  return true;
}

export { generatePassResetTokens, isTokenHashMatched };
