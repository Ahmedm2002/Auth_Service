# Index Strategy

In an authentication system, performance is absolutely critical. When a user tries to log in, we need to verify their credentials instantly. Without database indexes, PostgreSQL would be forced to perform a sequential scan—meaning it would read every single row in a table to find a matching user or session. As our user base grows, those sequential scans would severely degrade the performance of our application.

To keep queries lightning fast, we rely on a carefully planned index strategy. Here is a breakdown of the key indexes we use and why they matter.

## The Email Index on Users

We place an index on the `email` column in the `users` table.

Every time a user attempts to log in, we query the database using their email address. Without an index, logging in would become slower with every new account registered. This index guarantees that, no matter how many millions of users we have, we can instantly retrieve the user's hashed password and verify their request. It also enforces uniqueness, ensuring we never accidentally register two accounts with the same email.

## The Username Index on Users

We maintain an index on the `username` column as well.

Because usernames are often used for public profile lookups, we index this column to ensure those lookups are fast. Just like the email index, this prevents the database from scanning the entire users table every time someone visits a profile page.

## The User ID Index on Sessions

We index the `user_id` column within our `sessions` table.

Whenever we need to view a user's active devices or forcefully log them out of all sessions, we query this table by their user ID. By indexing this foreign key, we can retrieve and revoke sessions without forcing the database to scan millions of unrelated session records.

## The Session Token Index on Sessions

The `session_token` index acts as the backbone of our stateless authentication flow.

Every single authenticated request that hits our API contains a session token in its headers or cookies. Our API must validate this token before processing the request. Because this validation happens on almost every API call, looking up a session by its token must be practically instantaneous. This index ensures that finding a session by its token takes milliseconds, effectively removing the database bottleneck for authenticated endpoints.

## The Token Index on Password Reset Tokens

When a user clicks a password reset link in their email, they provide us with a unique token. We query the `password_reset_tokens` table to ensuring the token exists, belongs to a valid user, and hasn't expired. Since this token is a cryptographically strong, random string, we index the `token` column to make this lookup fast and efficient.

## The Expires At Index on Password Reset Tokens

Over time, our database fills up with expired password reset tokens that users never clicked. We periodically run a cleanup job to delete these old rows and free up disk space. We place an index on the `expires_at` column to ensure that this cleanup query finds all the expired records without freezing the database.
