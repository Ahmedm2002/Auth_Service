# Database

The primary database of this auth service is postgres. The reason to use postgresql is due to its reliability and the performance along with the features like `ACID` and `WAL` that helps to store presistant data in the database.

- Postgresql also provides row level locking which is usefull while checking of the users is already verified in case a user clicks twice on the row so to maintain data consistency `Row level Locks` are used to prevent race conditions

## Tables

### users

This table stores the information of the users

| Column | Data Type | Required |
| id | UUID |
| name | VARCHAR(30) |
| email | VARCHAR(50) |
| password_hash | TEXT |

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
