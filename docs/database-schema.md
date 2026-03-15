# Database Schema

Our authentication service relies on a clean, normalized relational database schema built in PostgreSQL. By keeping the schema focused strictly on identity and access management, we ensure fast queries and data integrity.

The system is built primarily around three core tables.

## The Users Table

The `users` table is the foundation of the system. It stores the core identity of everyone who signs up for the application.

This table is intentionally kept minimal. It holds the user's email address, a securely hashed version of their password, and their core profile details. We also track their verification status to ensure they have proven ownership of their email address before we grant them full access. We do not store application-specific settings or preferences in this table; it is strictly dedicated to answering the question: "Who is this person?"

## The Sessions Table

The `sessions` table is how we keep track of active logins.

Instead of issuing a stateless token that lives forever, we create a record in the `sessions` table every time a user successfully logs in. We store a unique session token along with a reference to the user ID. We also capture metadata about the login, such as the device type and IP address.

This table is incredibly powerful because it grants us control. If a user's device is stolen, or their account is compromised, we can easily query this table and delete their active sessions, instantly logging them out across all devices. We use this table to validate every authenticated request that enters our system.

## The Password Reset Tokens Table

The `password_reset_tokens` table handles account recovery. 

When a user forgets their password, we generate a highly secure, randomized token and securely store it in this table alongside an expiration timestamp and the user's ID. 

Because we store these tokens as individual records in the database, we can easily enforce rules around them. We can ensure that a token can only be used once, and we can reliably reject any tokens that have passed their expiration date. Once a user successfully resets their password, we delete the token from this table to prevent reuse.
