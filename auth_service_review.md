# Auth Service — Deep Technical Code Review

> **Reviewer**: Senior Backend Architect & Security Reviewer  
> **Reviewed At**: 2026-03-12  
> **Scope**: Full codebase review — excluding health check routes and queue implementation  
> **Stack**: Node.js (ESM), TypeScript, Express 5, PostgreSQL (`pg`), JWT, bcrypt, Zod, Pino, BullMQ, Redis, Nodemailer

---

## Executive Summary

The Auth Service demonstrates a **solid architectural intent**: clear layering (Router → Controller → Service → Repository), proper use of Zod for input validation, parameterized SQL queries throughout, Pino for structured logging, and the right foundational security libraries (Helmet, bcrypt, JWT). These are real positives.

However, the service has **multiple critical security vulnerabilities and correctness bugs** that make it unsuitable for production in its current state. The most severe issues are:

- **The [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) file with real credentials and weak JWT secrets is committed to the repository.** This is a critical secret leak.
- **The [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41) middleware calls `next()` _before_ attaching `req.user`**, creating a race condition where downstream handlers receive an unauthenticated request context.
- **The OTP generation uses `Math.random()`** (not cryptographically secure), making email verification codes predictable.
- **[forgotPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts#17-57) reveals whether an email exists** in the database via a 404 vs. 200 response gap — a classic user-enumeration vulnerability.
- **The password reset token is transmitted as a plain query parameter** (`?/t=`) over what may be an HTTP URL in development configs.
- **[setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) has a logically broken SQL condition** (`AND expires_at IS NULL`) that will never update a row after a token is set.
- **[logOutAllDevices](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#48-58) accepts `userId` from `req.body`** — not from the validated JWT — meaning any authenticated user can log out _any other user_.
- **Rate limiting is in-memory only** — it resets on restart and doesn't work across multiple instances.
- **`console.log` is mixed throughout** alongside Pino, with the real [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) credentials outputting to logs.

---

## Architecture Review

### Strengths

- **Clean layered architecture.** Routes → Controllers → Services → Repositories is correctly separated. No business logic bleeds into controllers; no SQL leaks into services.
- **Versioned routing** (`/api/v1/...`) with a clear [router/v1/index.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/router/v1/index.ts) aggregator is a good pattern.
- **DTOs and Interfaces** are defined separately (`dtos/`, `interfaces/`), showing an intent to separate data contracts from internals.
- **Constants file** centralizes shared magic values like cookie options and OTP expiry time.

### Issues

| Area | Issue | Severity |
|---|---|---|
| Entry point | `dotenv.config()` is called in both [index.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/index.ts) and [app.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/app.ts) and [db.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/configs/db.ts) — redundant calls, and ordering is fragile | Low |
| Entry point | [index.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/index.ts) uses `console.log` for startup messages, not the Pino logger | Low |
| Entry point | Only `SIGTERM` is handled; `SIGINT` (Ctrl+C in dev) is not — pool won't close cleanly in development | Medium |
| App bootstrap | `transport.verify()` (Nodemailer SMTP check) is called inside [app.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/app.ts) — this side-effect doesn't belong at module level | Medium |
| App bootstrap | `app.use(express.static("public/"))` registers a static file server — its purpose in an auth service is unclear and represents unnecessary attack surface | Low |
| Routing | [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41) is applied at the router level for `/v1/user-session`, but **is also re-imported inside [userSessions.routes.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/router/v1/userSessions.routes.ts)** (line 8) and would be double-applied if the route file used it directly; currently not double-applied, but the redundant import is confusing | Low |
| Routing | The [getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) endpoint is nested under `/v1/user-session` and protected by [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41) — but refreshing an access token is explicitly for users whose access token has expired; they _cannot_ send a valid `Authorization` header to reach this endpoint | **Critical** |
| Config | No startup validation of required environment variables — the server will start silently with missing secrets | High |
| Modularity | [db.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/configs/db.ts) connects the pool at import time (side-effect) and also connects again in [index.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/index.ts). Two connection attempts happen on startup | Low |

---

## Security Analysis

### 🔴 CRITICAL — Credentials Committed to Repository

**File**: [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env)

The [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) file is tracked in Git with real plaintext credentials:
```
JWT_REFRESH_SECRET=itoiajdlcvhoiwurierutoiajfosd    ← extremely weak, committed
JWT_ACCESS_SECRET=orojsdldhofajnboifjlakviusfhaskvod ← extremely weak, committed
DATABASE_PASSWORD=password123                          ← trivially guessable
GOOGLE_APP_PASSWORD="tefw qmqs gexs rbxg"             ← live Gmail App Password committed
```

This must be treated as an **immediate credential rotation event**. The Google App Password and all JWT secrets must be rotated now. The [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) file must be added to [.gitignore](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.gitignore).

---

### 🔴 CRITICAL — Auth Middleware: `next()` Called Before Attaching `req.user`

**File**: [src/middlewares/auth.middleware.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts) lines 25–27

```typescript
// CURRENT (BROKEN)
const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
next();                                          // ← request continues HERE
req.user = { id: decoded.sub as string };        // ← user attached AFTER next() returns
```

`next()` is asynchronous in Express — by the time the controller runs, `req.user` may not be set. This is a **logic correctness bug** and a potential authentication bypass depending on V8 execution timing. Fix: attach `req.user` before calling `next()`.

```typescript
// CORRECT
const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
req.user = { id: decoded.sub as string };
req.deviceInfo = new UAParser(req.headers["user-agent"] || "");
next();
```

---

### 🔴 CRITICAL — [getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) Endpoint is Unreachable by Design

**File**: [src/router/v1/index.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/router/v1/index.ts) line 12

```typescript
router.use("/v1/user-session", authenticateUser, sessionRoutes);
```

[getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) is behind [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41), which requires a valid _access_ token in the `Authorization` header. But the entire purpose of this endpoint is to **generate a new access token when the old one has expired**. An expired access token will fail `jwt.verify()` in the middleware, returning a 401 before the handler is ever reached. This endpoint is completely non-functional in its current routing configuration.

**Fix**: Move [getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) to an unprotected route, or use a dedicated refresh token middleware that validates the refresh token from the body instead.

---

### 🔴 CRITICAL — OTP Uses `Math.random()` (Not Cryptographically Secure)

**File**: [src/utils/nodeMailer/sendVerificationEmail.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/utils/nodeMailer/sendVerificationEmail.ts) lines 22–26

```typescript
function getRandomNum(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 9);  // ← NOT cryptographically random
  }
  return code;
}
```

`Math.random()` is seeded and predictable. A 4-digit numeric OTP already has only 9,999 possible values. Combined with a non-CSPRNG, this is trivially brute-forceable. Additionally, the range is `0–8` (not `0–9`, since `Math.random()` never returns 1.0 exactly, and floor of 9\*x where x<1 gives 0–8).

**Fix**: Use `crypto.randomInt(0, 10)` for each digit, or generate a 6-digit code.

```typescript
import crypto from "node:crypto";
function getRandomNum(): string {
  return String(crypto.randomInt(0, 999999)).padStart(6, "0");
}
```

---

### 🔴 CRITICAL — User Enumeration in [forgotPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts#17-57)

**File**: [src/services/reset-password.service.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts) line 34

```typescript
const user = await Users.getByEmail(email);
if (!user) {
  return new ApiError(404, "User not found");  // ← reveals account existence
}
```

Returning a 404 when no account is found lets attackers probe which emails are registered. The existing happy-path message is actually correct (line 47: `"If the email exists, a reset link has been sent."`) — but the early 404 return undermines it.

**Fix**: Return the same 200 response regardless of whether the user exists:
```typescript
if (!user) {
  return new ApiResponse(200, null, "If the email exists, a reset link has been sent.");
}
```

The same pattern applies to [verifyEmail](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/verify-email.service.ts#14-70) and [resendCode](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/verify-email.service.ts#70-102) —returning 404 "User not found" also leaks account existence.

---

### 🔴 CRITICAL — [logOutAllDevices](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#48-58) Accepts Unverified `userId` from Body

**File**: [src/controllers/userSessions.controller.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts) line 49

```typescript
const { userId } = req.body;  // ← attacker-controlled input
const response = await userSessionServ.deleteAllSessions(userId);
```

Any authenticated user can pass any arbitrary `userId` in the request body and log out all sessions for _any_ user, including admins. The `userId` must be extracted from the verified JWT via `req.user.id` (set by [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41)), not from the request body.

---

### 🔴 HIGH — Password Reset Token URL Construction Bug

**File**: [src/utils/nodeMailer/sendPassResetEmail.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/utils/nodeMailer/sendPassResetEmail.ts) line 6

```typescript
const resetUrl = process.env.RESET_PASSWORD_REDIRECT_BASE_URL + `?/t=${token}`;
//                                                                   ^ extra slash
```

The query parameter is `?/t=token` (with a leading slash) instead of `?t=token`. This means the frontend cannot reliably parse the token from the URL. Also notably:
- The full 64-character hex token is transmitted in the URL — it will appear in server logs, browser history, and `Referer` headers.
- Best practice is to use a short-lived signed URL or have the token submitted via a form POST, not URL params.

---

### 🔴 HIGH — Broken SQL in [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31)

**File**: [src/repositories/reset_password.repo.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts) lines 22–25

```sql
UPDATE password_recovery_tokens 
SET used_at = NOW() 
WHERE id = $1 AND expires_at IS NULL  -- ← expires_at is always set on insert
```

`expires_at` is set to `NOW() + INTERVAL '5 min'` on every [insertToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#7-20) call—it will **never** be `NULL`. This condition will never match, meaning the token is never marked as `used_at`, allowing a single token to be reused indefinitely after a successful password reset.

**Fix**: The condition should be `AND used_at IS NULL`, not `AND expires_at IS NULL`.

```sql
UPDATE password_recovery_tokens 
SET used_at = NOW() 
WHERE id = $1 AND used_at IS NULL  
RETURNING id
```

---

### 🔴 HIGH — `password_recovery_tokens` Schema: `used_at` Column Named `user_at`

**File**: [database/001_init.sql](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/database/001_init.sql) line 40

```sql
user_at TIMESTAMPTZ DEFAULT NULL    ← typo — should be "used_at"
```

The schema names the column `user_at`, but all code references `used_at`. This means the `resetToken.used_at` check in the service (line 101) and [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) in the repo will either always be `undefined` (no column named `used_at`) or cause a runtime error. This is a schema-code mismatch.

---

### 🔴 HIGH — Missing [id](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#34-58) Column in [reset_password.repo.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts) [getUserToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#31-47) Query

**File**: [src/repositories/reset_password.repo.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts) lines 38–41

```sql
SELECT token_hash, used_at, expires_at, user_id 
FROM password_recovery_tokens WHERE user_id = $1
```

The [id](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#34-58) column is not selected but is used in the service: `resetToken.id` is passed to `resetPassRepo.setTokenUsedAt(resetToken.id)`. Since [id](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#34-58) is not returned, `resetToken.id` will be `undefined` and the [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) call will do nothing.

---

### 🟡 MEDIUM — Rate Limiter is In-Memory (Not Distributed)

**File**: [src/middlewares/rateLimitter.middleware.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/rateLimitter.middleware.ts)

`express-rate-limit` defaults to an in-memory store. In a multi-instance deployment (or after any restart), limits reset. An attacker can bypass rate limiting by distributing requests across instances or restarting the service. Use `rate-limit-redis` backed by the existing Redis instance.

---

### 🟡 MEDIUM — No `SameSite` on Cookies / Cookies Not Environment-Aware

**File**: [src/constants.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/constants.ts)

```typescript
cookieOpts: {
  httpOnly: true,
  secure: true,    // ← will break in development (HTTP)
  // sameSite missing entirely ← CSRF risk
}
```

- `secure: true` hardcoded will cause cookies to fail on any non-HTTPS connection including local development.
- The `SameSite` attribute is missing — without `SameSite: Strict` or `Lax`, cookies are vulnerable to CSRF in some browser configurations even with `HttpOnly`.

---

### 🟡 MEDIUM — JWT Secrets Have Inadequate Entropy

The committed JWT secrets (`itoiajdlcvhoiwurierutoiajfosd`) are human-readable strings, not cryptographically generated random bytes. JWT HMAC secrets should be at minimum 256 bits of random data:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 🟡 MEDIUM — Refresh Token Not Validated in JWT; Only Compared via bcrypt

**File**: [src/services/tokens.service.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/tokens.service.ts) lines 56–67

The refresh token is stored as a bcrypt hash in the database and compared directly — it is never verified as a JWT. This means:
- The refresh token's `sub`, `iss`, and `aud` claims are never validated.
- An attacker who can forge the token structure (unlikely with a strong secret, but good defense-in-depth) would bypass the JWT signature check as the token is compared purely by hash.
- The proper pattern is to `jwt.verify()` the refresh token first, then do the bcrypt comparison.

---

### 🟡 MEDIUM — No Brute-Force Protection on OTP/Token Endpoints

The `/verify` and `/password/reset` endpoints have no rate limiting. An attacker can brute-force the 4-digit OTP (only 9999 combinations) or the password reset token without restriction.

---

### 🟡 MEDIUM — [forgotPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts#17-57) Inserts Reset Token Before Sending Email

**File**: [src/services/reset-password.service.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts) lines 37–42

```typescript
const id = await resetPassRepo.insertToken(user.id, encryptedToken);  // token saved to DB
await sendPasswordResetEmail(email, originalToken);                    // email sent AFTER
```

If email delivery fails, the token is already in the database. The user can't get a new valid token without triggering the flow again. Not critical, but a usability and consistency issue. Email should be sent first or the two operations wrapped in a transaction.

---

### 🟢 Positives in Security

- Parameterized queries throughout — no SQL injection risk.
- bcrypt with cost factor 10 for passwords.
- SHA-256 for password reset tokens (appropriate for non-reversible single-use tokens).
- Helmet middleware applied.
- JWT using `issuer` and `audience` claims.
- `httpOnly` cookies.
- `deleted_at IS NULL` soft-delete filter on all user queries.

---

## Code Quality

### Issues

| Issue | Location | Severity |
|---|---|---|
| `console.log` vs Pino used inconsistently — `console.log` found in 12+ locations (controllers, services, repos, index.ts) | Widespread | Medium |
| Typo in filename: [verfiyUser.controller.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/verfiyUser.controller.ts) (should be `verifyUser`) | controllers/ | Low |
| Typo in variable: `vaildationError` in [auth.service.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/auth.service.ts) line 41 | auth.service.ts:41 | Low |
| `emaiVerification` (typo) used as variable name | verify_email.repo.ts:52, auth.service.ts:18 | Low |
| Empty JSDoc comments (`@param req`, `@param res` with no descriptions) added to almost every function — adds noise with no value | Every controller | Low |
| `class AuthService { constructor() {} }` — unnecessary empty constructors in every class | All service/repo classes | Low |
| `const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;` defined locally in [tokens.service.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/tokens.service.ts) but never used (expiry check uses `session.expires_at` from DB directly) | tokens.service.ts:53 | Low |
| `console.log(req.deviceInfo)` left in auth middleware — logs full UA object on every authenticated request | auth.middleware.ts:28 | Medium |
| [(\"pino-http\");](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/utils/helperFuncs/randomToken.ts#2-6) dangling expression in [app.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/app.ts) line 7 (likely a removed import left as a string literal) | app.ts:7 | Low |
| `deviceType` hardcoded to empty string `""` with a `// TODO` comment — UA parsing library is imported but not used to set this | auth.service.ts:61 | Low |
| Login success message says `"User saved successfully"` — incorrect, should be `"Login successful"` | auth.service.ts:87 | Low |
| [getAllSessions](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#6-22) returns a 404 when a user has no sessions — this is a valid state, not an error; should return 200 with an empty array | user-session.service.ts:22–23 | Medium |
| Raw session data including device metadata returned directly from [getAllSessions](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#6-22) without DTO mapping — refresh token hashes are NOT selected, which is good, but `device_id` and internal IDs are exposed | user-session.service.ts | Low |

---

## Data Layer Review

### Schema: [database/001_init.sql](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/database/001_init.sql)

| Issue | Severity |
|---|---|
| `password_recovery_tokens.user_at` — typo for `used_at`, causes runtime mismatch with application code | **Critical** |
| Missing semicolons after `email_verification_tokens` and `password_recovery_tokens` CREATE TABLE statements — SQL will fail to parse | High |
| `user_sessions.device_type` is `JSONB DEFAULT '{}'::jsonb` but app stores it as an empty string `""` — type mismatch | Medium |
| No index on `users.email` — every login and signup triggers a full table scan (UNIQUE creates an implicit index, so this is actually fine) | ✅ OK |
| No index on `user_sessions(user_id)` — [getAll](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/user_session.repo.ts#65-82) and [deleteAllSessions](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#59-80) join by `user_id` with no index | Medium |
| No index on `email_verification_tokens(user_id)` (UNIQUE constraint provides one — ✅ OK) | ✅ OK |
| No index on `password_recovery_tokens(user_id)` — [getUserToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#31-47) does a full table scan | Medium |
| `last_login_at` column exists in the schema but is never updated on login | Low |
| `updated_on` column exists but is never updated on any `UPDATE` query — should use a trigger or be set explicitly | Low |
| No migration tooling (Flyway, node-pg-migrate, etc.) — a single raw SQL file is fragile for schema evolution | Medium |

### Query Review

| Issue | Severity |
|---|---|
| [getAll](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/user_session.repo.ts#65-82) uses `SELECT *` for sessions — should explicitly name columns | Low |
| [setUserVerified](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/user.repo.ts#97-134) correctly uses a transaction with `BEGIN`/`COMMIT`/`ROLLBACK` — ✅ good | ✅ |
| [resetPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/resetPassword.controller.ts#6-26) flow: [updatePassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/user.repo.ts#68-80) and [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) and [deleteAllSessions](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#59-80) are **three separate queries with no transaction** — if any one fails partway, the data is inconsistent (e.g. password updated but old sessions not cleared) | High |
| `email_verification_tokens.insert` passes `"NOW() + INTERVAL '5 min'"` as a **string parameter** (`$3`) instead of as SQL — the value will be stored as the literal string, not a timestamp | **Critical** |

---

## Production Readiness

### Configuration Management

- **No startup config validation.** If `JWT_ACCESS_SECRET` or `DATABASE_PASSWORD` is missing, the server starts and fails at request time with a cryptic error. Add a startup guard:
  ```typescript
  const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "DATABASE_PASSWORD"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
  ```
- **ALLOWED_ORIGIN is not in [.env.sample](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env.sample)** — consumers of the service will not know to set it and will fall back to `localhost:3000` silently.
- `process.env.API_VERSION` is read in [app.ts](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/app.ts) before `dotenv.config()` is called at line 14 (the `dotenv.config()` call at line 12 happens first — this is OK but fragile ordering).

### Scalability

- **In-memory rate limiting** will not scale horizontally. Must use Redis-backed store.
- **Nodemailer is synchronous (blocking)** in the signup and resend code flows — a slow SMTP server stalls the HTTP response. Email sending must be offloaded to the BullMQ queue (TODOs are acknowledged in comments but not implemented).
- The `pg.Pool` is configured with `max: 20` connections — reasonable, but there is no `idleTimeoutMillis` or `connectionTimeoutMillis` set, which can cause requests to hang if the database is slow.

### Observability

- **No structured error logging** — errors are logged by `console.log("Error: ", error.message)`, discarding the stack trace and making correlation impossible in production.
- **No request correlation ID propagation** — request IDs are generated in the logger middleware but not passed to services or attached to log lines that originate from services.
- **No metrics endpoint** — no Prometheus-compatible `/metrics` or similar.
- **No distributed tracing** (e.g. OpenTelemetry).
- Mixed logging: Pino is configured but `console.log` is used in the majority of error paths.

### Fault Tolerance

- No retry logic on database connection failures.
- No circuit breaker for email sends.
- Database pool exhaustion will cause all requests to hang with no timeout configured.

### Docker Configuration

**File**: [dockerFile](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/dockerFile) (malformed name)

```dockerfile
FROM node:23-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

- `COPY . .` copies the entire project including [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env), `node_modules`, `dist`, and development files into the image.
- Running `npm install` inside the container without a lock file first (`npm ci`) is non-reproducible.
- The `CMD` runs `npx tsc && node...` at container start — compilation at startup is extremely slow.
- No multi-stage build — the final image includes TypeScript, devDependencies, and all source files.
- No `USER` directive — container runs as root.

---

## Critical Issues Summary

| # | Issue | Severity |
|---|---|---|
| 1 | Real credentials and weak JWT secrets committed to Git in [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) | 🔴 Critical |
| 2 | [authenticateUser](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/middlewares/auth.middleware.ts#9-41) middleware calls `next()` before setting `req.user` | 🔴 Critical |
| 3 | [getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) endpoint protected by access token auth — unreachable when token expires | 🔴 Critical |
| 4 | OTP uses `Math.random()` — not cryptographically secure | 🔴 Critical |
| 5 | [logOutAllDevices](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#48-58) uses attacker-supplied `userId` from body | 🔴 Critical |
| 6 | [forgotPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts#17-57) returns 404 for non-existent email — user enumeration | 🔴 Critical |
| 7 | [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) SQL has `AND expires_at IS NULL` — will never match | 🔴 Critical |
| 8 | `password_recovery_tokens` schema column named `user_at` not `used_at` | 🔴 Critical |
| 9 | [getUserToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#31-47) does not select [id](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#34-58) column — `resetToken.id` is `undefined` | 🔴 Critical |
| 10 | `email_verification_tokens.insert` passes interval as string param — stored as literal text | 🔴 Critical |
| 11 | Password reset URL has `?/t=` bug | 🔴 High |
| 12 | No transaction wrapping [resetPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/resetPassword.controller.ts#6-26) multi-step operation | 🔴 High |
| 13 | Missing `SameSite` cookie attribute | 🟡 Medium |
| 14 | In-memory rate limiter not suitable for distributed deployment | 🟡 Medium |
| 15 | No startup validation of required environment variables | 🟡 Medium |
| 16 | Docker image copies [.env](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.env) and runs as root | 🟡 Medium |

---

## Recommended Improvements

### 1. Rotate All Secrets Immediately, Fix [.gitignore](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/.gitignore)
```bash
# .gitignore
.env
*.env
```
Generate proper secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Fix Auth Middleware Order
```typescript
// auth.middleware.ts
const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as jwt.JwtPayload;
req.user = { id: decoded.sub as string };
next();  // ← always last
```

### 3. Fix OTP Generation
```typescript
import crypto from "node:crypto";
function getOtp(digits = 6): string {
  return String(crypto.randomInt(0, 10 ** digits)).padStart(digits, "0");
}
```

### 4. Fix `email_verification_tokens.insert` — Interval Must Be SQL Not String
```typescript
// verify_email.repo.ts
await pool.query(
  `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
   VALUES ($1, $2, NOW() + INTERVAL '5 min')
   ON CONFLICT(user_id) DO UPDATE
   SET token_hash = $2, revoked_at = NOW(), expires_at = NOW() + INTERVAL '5 min'
   RETURNING id`,
  [userId, token],   // ← only 2 params, interval is inline SQL
);
```

### 5. Fix Schema Typos and Missing Indexes
```sql
-- Fix typo
ALTER TABLE password_recovery_tokens RENAME COLUMN user_at TO used_at;

-- Add missing indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_password_recovery_tokens_user_id ON password_recovery_tokens(user_id);
```

### 6. Add Missing [id](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/user-session.service.ts#34-58) to [getUserToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#31-47) + Fix [setTokenUsedAt](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/repositories/reset_password.repo.ts#20-31) Condition
```sql
-- getUserToken
SELECT id, token_hash, used_at, expires_at, user_id FROM password_recovery_tokens WHERE user_id = $1;

-- setTokenUsedAt
UPDATE password_recovery_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id;
```

### 7. Wrap [resetPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/resetPassword.controller.ts#6-26) in a Transaction
```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
  await client.query("UPDATE password_recovery_tokens SET used_at = NOW() WHERE id = $1", [tokenId]);
  await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

### 8. Move [getAccessToken](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#59-74) Out From Behind Auth Middleware
```typescript
// router/v1/index.ts
router.use("/v1/auth", authRoutes);
router.post("/v1/token/refresh", getAccessToken);  // ← no authenticateUser
router.use("/v1/user-session", authenticateUser, sessionRoutes);
```

### 9. Use `req.user.id` in [logOutAllDevices](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/controllers/userSessions.controller.ts#48-58)
```typescript
async function logOutAllDevices(req: Request, res: Response) {
  const userId = (req as CustomRequest).user?.id;  // ← from JWT, not body
  ...
}
```

### 10. User-Enumeration-Safe [forgotPassword](file:///home/ahmedmujtaba/Development/Back%20Ends/Auth_Service/src/services/reset-password.service.ts#17-57)
```typescript
if (!user) {
  // Same response regardless - don't leak account existence
  return new ApiResponse(200, null, "If the email exists, a reset link has been sent.");
}
```

### 11. Add Environment Validation on Startup
```typescript
// src/utils/validateEnv.ts
const REQUIRED = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "DATABASE_PASSWORD", "GOOGLE_APP_PASSWORD"];
export function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
}
```

### 12. Redis-Backed Rate Limiter
```typescript
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
const store = new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) });

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, store });
```

### 13. Fix Docker Image
```dockerfile
FROM node:23-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:23-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
USER appuser
CMD ["node", "dist/src/index.js"]
```

### 14. Standardize on Pino — Remove All `console.log` Calls

Replace all 12+ `console.log` usages with structured Pino calls:
```typescript
// Bad
console.log("Error: ", error.message);

// Good  
logger.error({ err: error, requestId: req.requestId }, "Login failed");
```

---

## Production Readiness Score

### **3.5 / 10**

| Dimension | Score | Notes |
|---|---|---|
| Security | 2/10 | Multiple critical vulns: credential leak, auth bypass, OTP weakness, user-enum, CSRF gaps |
| Correctness | 3/10 | 3+ features are functionally broken (token refresh endpoint, setTokenUsedAt, expires_at param) |
| Architecture | 7/10 | Clean layering, good intent, proper separation of concerns |
| Code Quality | 5/10 | Consistent style but mixed logging, typos, and missing consistency |
| Data Layer | 4/10 | Good schema design intent but typos, missing indexes, and broken queries |
| Production Ops | 3/10 | No startup validation, no distributed rate limiting, poor Docker, no metrics |
| Observability | 2/10 | Mixed console/pino, no correlation IDs propagated, no metrics |

**The architecture foundation is genuinely good** — the layering, DTO separation, use of Zod and parameterized SQL are all solid choices. However, the service has too many critical security vulnerabilities and broken features to be considered production-ready. With focused effort on the Critical Issues listed above (estimated 2–3 days of work), the score could reasonably reach **7/10**. The remaining gap to 10/10 would require: distributed rate limiting, queue-based email delivery, structured observability, a proper migration system, and a hardened CI/CD pipeline.
