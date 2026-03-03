export interface PasswordResetI {
  id: string;
  user_id: string;
  created_at: string;
  used_at?: string;
  expires_in: string;
}
