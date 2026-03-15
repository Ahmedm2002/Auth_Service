# Design Decisions

When building an authentication service, every technical choice carries weight. We made several architectural decisions to prioritize security, reliability, and correctness. This document outlines those key decisions and the reasoning behind them.

## The Database as the Source of Truth

We treat the database as the absolute source of truth for token expiration and session validity.

Instead of issuing JSON Web Tokens (JWTs) that live entirely within the client and application memory, we store stateful session tokens in PostgreSQL. When we issue a token, we record its expiration and metadata in the database. 

We do this because relying solely on application memory creates complex edge cases. If an administrator needs to ban a user, or a user wants to log themselves out of all active devices, standard stateless tokens make immediate revocation nearly impossible. By verifying tokens against the database on every sensitive request, we regain absolute control over active sessions at the cost of a slight database overhead.

## The UTC Standard for All Timestamps

Dealing with time across distributed systems is notoriously difficult. If our application servers live in different geographic regions, or if our database cluster spans multiple timezones, recording a local timestamp can lead to catastrophic bugs—like tokens expiring prematurely or living far beyond their intended lifespan.

To completely prevent these issues, all time values in our database are stored exclusively in Coordinated Universal Time (UTC). The application handles all date parsing natively in UTC before interacting with the database.

When configuring our PostgreSQL environment, we explicitly enforce this setting. You can set the time zone for an active session with this command:

```sql
SET TIME ZONE 'UTC';
```

Or, for persistent configuration across the entire database, we apply this global setting:

```sql
ALTER DATABASE database_name SET timezone TO 'UTC';
```

## SQL Isolated in Repositories

We strictly isolate all SQL queries inside dedicated repository files rather than letting them bleed into our service logic.

When you mix SQL queries with business logic—like password validation or email sending routines—the code becomes tangled and incredibly fragile. It becomes impossible to test your business logic without also mocking an entire database connection. By forcing all SQL into the repository layer, we keep our domain logic clean, readable, and highly testable. If we ever need to optimize a slow query, we know exactly where it lives, and we can change it without touching the underlying business rules.

## The Stateless API

Even though we use a database to store session data, the API itself remains entirely stateless.

Our Node.js and Express servers do not hold any user state in memory between requests. When a request completes, the server forgets it entirely. This is a critical design choice for horizontal scaling. Because no server relies on locally cached session data, we can spin up ten new instances of the authentication service, put them behind a load balancer, and any instance can process any request seamlessly by reading the session from the shared database.
