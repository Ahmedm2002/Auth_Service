CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  profile_picture TEXT,
  verified_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create table if not exists email_verification_tokens(
  id uuid unique not null primary key,
  user_id uuid not null unique references users(id) on delete cascade,
  token_hash text not null,
  used_at TIMESTAMPTZ default null,
  revoked_at TIMESTAMPTZ default null
)