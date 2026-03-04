export interface userSessionI {
  id?: string;
  user_id?: string;
  device_id?: string;
  device_type?: string;
  refresh_token?: string;
  expires_at?: Date;
  user_agent?: string;
}
