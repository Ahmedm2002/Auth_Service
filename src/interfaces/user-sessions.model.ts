export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  vendor?: string;
  model?: string;
}

export interface userSessionI {
  id?: string;
  user_id?: string;
  device_id?: string;
  device_type?: DeviceInfo;
  refresh_token?: string;
  expires_at?: Date;
  created_at?: Date;
}
