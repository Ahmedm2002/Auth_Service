export interface PasswordResetI {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  token_hash: string;
  used_at?: Date;
}
