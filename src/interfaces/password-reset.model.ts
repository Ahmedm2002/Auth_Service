export interface PasswordResetI {
  id: string;
  user_id: string;
  created_at: Date;
  used_at?: Date;
  expires_at: Date;
}
