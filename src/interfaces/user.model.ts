export interface userI {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  profile_picture?: string;
  last_login_at?: Date;
  verified_at?: Date;
  deleted_at?: Date;
  created_on?: Date;
  updated_on?: Date;
}
