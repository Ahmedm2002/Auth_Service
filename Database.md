# Database

The primary database of this auth service is postgres. The reason to use postgresql is due to its reliability and the performance along with the features like `ACID` and `WAL` that helps to store presistant data in the database.

## Tables

### users

This table stores the information of the users

| Column          | Data Type    | Required | Constraints                           |
| --------------- | ------------ | -------- | ------------------------------------- |
| id              | UUID         | Yes      | PRIMARY KEY DEFAULT gen_random_uuid() |
| name            | VARCHAR(30)  | Yes      | —                                     |
| email           | VARCHAR(255) | Yes      | UNIQUE                                |
| password_hash   | TEXT         | Yes      | —                                     |
| last_login_at   | TIMESTAMPTZ  | No       | —                                     |
| profile_picture | TEXT         | No       | —                                     |
| verified_at     | TIMESTAMPTZ  | No       | —                                     |
| deleted_at      | TIMESTAMPTZ  | No       | —                                     |
| created_on      | TIMESTAMPTZ  | Yes      | DEFAULT now()                         |
| updated_on      | TIMESTAMPTZ  | Yes      | DEFAULT now()                         |

### user_sessions

### email_verification_tokens

## Indexes

users -> id
users -> email

## Partial Index

```
create index active_users
on users(deleted_at)
where deleted_at is not null
```
