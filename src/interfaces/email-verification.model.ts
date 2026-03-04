export interface EmailVerificationI {
  id: string;
  user_id: string;
  used_at: string;
  device_id: string;
  token_hash: string;
  created_at: Date;
  revoked_at: Date;
  expires_at: Date;
}
