# Auth Service — Production Readiness Code Review

> **Reviewed:** 2026-03-03  
> **Overall Production-Readiness Score: 4.5 / 10**  
> **Status: Not production-ready. Multiple critical bugs and missing security controls must be fixed first.**

---

## Table of Contents

1. [Overall Assessment](#1-overall-assessment)
2. [Critical Bugs (Must Fix Before Any Deployment)](#2-critical-bugs-must-fix-before-any-deployment)
3. [Security Issues](#3-security-issues)
4. [Logic & Design Issues](#4-logic--design-issues)
5. [Code Quality & Maintainability](#5-code-quality--maintainability)
6. [Missing Features for Production](#6-missing-features-for-production)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Testing](#8-testing)
9. [What Is Done Well](#9-what-is-done-well)
10. [Prioritized Roadmap to Production](#10-prioritized-roadmap-to-production)

---

## 1. Overall Assessment

The codebase shows a solid **structural foundation**: clean layered architecture (routes → controllers → services → repositories), versioned API routes, TypeScript with strict mode enabled, Zod validation, consistent `ApiResponse`/`ApiError` patterns, rate limiting, Helmet for HTTP headers, and Docker support. This is genuinely good for a growing backend project.

However, several **critical bugs** make the service non-functional as-is (the refresh token flow is completely broken, the password reset flow silently does nothing, and one controller has an inverted try/catch). Beyond bugs, there are important security gaps, incomplete features, a near-total absence of tests, and infrastructure issues that must all be addressed before this can be called production-grade.

---

## 2. Critical Bugs (Must Fix Before Any Deployment)

### BUG #1 — Inverted try/catch in `requestResetPassword` controller

**File:** `src/controllers/resetPassword.controller.ts` — Lines 32–43

```typescript
// BROKEN: the response is sent BEFORE the try/catch block.
// Any error thrown by the service is completely unhandled.
async function requestResetPassword(req: Request, res: Response) {
  const { email } = req.body;
  const response = await resetPasswordServ.requestPasswordReset(email); // runs outside try
  res.status(response.statusCode).json(response);                        // sends before try
  try {
  } catch (error: any) {   // this catch block can never catch anything
    ...
  }
}
```

**Fix:** Wrap the service call and `res.json()` inside the try block, move the response send inside it.

---

### BUG #2 — Broken Refresh Token Validation in `tokens.service.ts`

**File:** `src/services/tokens.service.ts` — Lines 51–58

```typescript
// COMPLETELY WRONG: bcrypt.compare is used to compare the refresh token
// against the JWT_REFRESH_SECRET environment variable string.
// This will ALWAYS return false. A refresh token can never be regenerated.
const isValidToken = await bcrpty.compare(
  refreshToken,
  process.env.JWT_REFRESH_SECRET!, // ← this is the JWT signing secret, NOT a bcrypt hash
);
```

**What it should do:** The refresh token stored in `user_sessions` is a **SHA-256 hash** (see `user_session.repo.ts` line 29–32). To validate, you should:

1. Hash the incoming `refreshToken` with `crypto.createHash('sha256').update(refreshToken).digest('hex')`
2. Compare the result against `session.refresh_token` from the database
3. Additionally, verify the JWT signature with `jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)`

---

### BUG #3 — Password Reset Never Actually Resets the Password

**File:** `src/services/reset-password.service.ts` — `resetPassword()` method (Lines 46–78)

The method validates the email and password, finds the user, and then returns a `200 OK — "Password reset successful"` response **without ever hashing or saving the new password to the database**. There is no `Users.updateUser(...)` call or any `UPDATE` query. The password silently remains unchanged.

---

### BUG #4 — `deleteAllSessions` Queries by Wrong Column

**File:** `src/repositories/user_session.repo.ts` — Lines 58–68

```sql
-- BUG: filters by `id` instead of `user_id`
DELETE FROM user_sessions WHERE id = $1 RETURNING id
```

This will at most delete one row (the session whose primary key matches the `userId` UUID, which is highly unlikely to match). It should be:

```sql
DELETE FROM user_sessions WHERE user_id = $1 RETURNING id
```

---

### BUG #5 — Route Registration Missing Leading Slash

**File:** `src/router/v1/index.ts` — Lines 8–10

```typescript
// WRONG: missing leading slash — Express will not match these routes correctly
router.use("v1/auth", authRoutes);
router.use("v1/verify", verficationRoutes);
router.use("v1/user-session", sessionRoutes);

// CORRECT:
router.use("/v1/auth", authRoutes);
router.use("/v1/verify", verficationRoutes);
router.use("/v1/user-session", sessionRoutes);
```

---

### BUG #6 — Orphaned Import Statement

**File:** `src/services/auth.service.ts` — Line 19

```typescript
// This line is a string literal expression — it does nothing and imports nothing.
// TypeScript may not even warn about this because it looks like a dynamic import string.
("../repositories/verification_tokens.repo.js");
```

This was likely a forgotten import that had its `import ...` keyword deleted. Either complete the import or remove the line.

---

### BUG #7 — Email Sending Is Commented Out, Token Logged to Console

**File:** `src/utils/nodeMailer/sendVerificationEmail.ts` — Lines 6–17

The actual `transport.sendMail(...)` call is entirely commented out. The function just generates a code and returns it without ever emailing the user. Worse, the calling code in `auth.service.ts` (line 132) and `verify-email.service.ts` (line 92) logs the token to the console:

```typescript
console.log("Token Send to ", newUser.email, ": ", token);
```

This leaks the plaintext OTP to logs, which is a **security vulnerability** in any real environment.

---

### BUG #8 — `sendPasswordResetEmail` Is an Empty Function

**File:** `src/utils/nodeMailer/sendPassResetEmail.ts`

```typescript
async function sendPasswordResetEmail(email: string) {} // completely empty
```

The password reset request flow calls this function, but no email is ever sent. The user receives a `200 OK` for a reset they never got.

---

### BUG #9 — `updateUser` in Repository Has a Broken SQL Query

**File:** `src/repositories/user.repo.ts` — Lines 83–99

```typescript
// This generates incorrect SQL — the SET clause is malformed
const query = updateFields.map((field, index) => `${index + 1}`); // just generates numbers, not "field = $N"
const queryText = `Update users set () ${query} where id = $1`; // "()" is invalid SQL
```

This function is currently unreachable in the app, but it will throw a database error if called.

---

## 3. Security Issues

### SEC #1 — Authentication Middleware Returns 500 for Invalid Tokens

**File:** `src/middlewares/auth.middleware.ts` — Lines 23–29

When `jwt.verify()` throws (e.g., token expired, invalid signature), the catch block returns **HTTP 500 (Internal Server Error)**. This is wrong — it should return **HTTP 401 (Unauthorized)** for `JsonWebTokenError`/`TokenExpiredError` and possibly **403 (Forbidden)** for expired tokens. Returning 500 hides authentication failures and confuses clients.

```typescript
// Should differentiate error types:
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
if (error instanceof TokenExpiredError) return res.status(401).json(...);
if (error instanceof JsonWebTokenError) return res.status(401).json(...);
return res.status(500).json(...); // only for truly unexpected errors
```

### SEC #2 — Decoded JWT Payload Never Attached to Request

**File:** `src/middlewares/auth.middleware.ts`

The `authenticateUser` middleware verifies the token but never attaches the decoded payload (userId, etc.) to `req.user`. This means downstream controllers can't know which user is authenticated. Nearly all protected endpoints accept `userId` from `req.body` or `req.query` instead — meaning **any authenticated user can query or manipulate data for any other user ID**. This is a broken authorization model.

**Fix:** Extend the Express `Request` type, attach decoded payload: `(req as any).user = decoded`, and have controllers use `req.user.sub` as the userId rather than accepting it from the request body.

### SEC #3 — `userId` Accepted from Request Body in Sensitive Endpoints

Multiple endpoints accept sensitive identifiers like `userId` directly from the client request body:

- `logOutAllDevices` — `const { userId } = req.body`
- `getAllSessions` — `const userId = req.query.userId as string`

This means any authenticated user can log out all sessions of any other user simply by sending a different `userId`. The `userId` must always come from the authenticated JWT payload, never from the client.

### SEC #4 — Session Routes Have No Authentication Middleware

**File:** `src/router/v1/userSessions.routes.ts`

All user session routes (`/all`, `/log-out`, `/log-out/all-sessions`, `/get-access-token`) are completely unprotected — no `authenticateUser` middleware is applied. Anyone can query or delete any user's sessions without any token.

### SEC #5 — No CORS Middleware Configured

A `cors.middleware.ts` file exists but is empty (0 bytes) and not applied in `app.ts`. Without CORS configuration, the browser's same-origin policy will block legitimate frontend requests, and the API has no control over which origins can call it.

### SEC #6 — OTP Uses `Math.random()` (Not Cryptographically Secure)

**File:** `src/utils/nodeMailer/sendVerificationEmail.ts` — Lines 22–28

```typescript
// Math.random() is NOT cryptographically secure
code += Math.floor(Math.random() * 9);
```

**Fix:** Use `crypto.randomInt(0, 9)` or `crypto.randomBytes()` for all security-sensitive random values.

### SEC #7 — No Input Size / Body Size Limit

`app.ts` uses `express.json()` with no size limit. A malicious client can send a huge JSON body to exhaust memory. Add:

```typescript
app.use(express.json({ limit: "16kb" }));
```

### SEC #8 — Password Max Length Only 12 Characters

**File:** `src/utils/validations/schemas.ts` — Line 9

```typescript
.max(12, "Password must be of 8-12 characters")
```

A maximum of 12 characters is very restrictive and makes the service vulnerable to brute force. Industry standard is a minimum of 8 and a maximum of at least 64–128 characters. Also consider adding complexity requirements (uppercase, digit, special character).

### SEC #9 — `.env` File Is Tracked in Version Control

**File:** `.env` (at repo root, 1252 bytes)

A `.env` file containing actual secrets exists in the repository. It should be added to `.gitignore` immediately and the secrets should be rotated.

### SEC #10 — Cookie Options Incomplete

**File:** `src/constants.ts`

The `cookieOpts` object only sets `httpOnly: true` and `secure: true`. For production, it should also include:

- `sameSite: 'strict'` or `'lax'` to prevent CSRF
- `maxAge` or `expires` to set explicit expiry
- `path` to restrict cookie scope

---

## 4. Logic & Design Issues

### LOGIC #1 — Email Already Verified Returns 201 Instead of 200

**File:** `src/services/verify-email.service.ts` — Line 46

```typescript
return new ApiResponse(201, null, "Email already verified");
// Should be 200. 201 means "Created".
```

### LOGIC #2 — `verifyEmail` Returns 201 on Success

**File:** `src/services/verify-email.service.ts` — Line 64

```typescript
return new ApiResponse(201, null, "User verified successfully");
// Verification is not a creation event. Should return 200.
```

### LOGIC #3 — `resendCode` Returns 201 for Already-Verified User

**File:** `src/services/verify-email.service.ts` — Line 88

```typescript
return new ApiResponse(200, null, "User already verified");
// OK status code, but should probably be 409 Conflict or a 400 Bad Request
// since re-verifying a verified user is a client error.
```

### LOGIC #4 — `getAll` Sessions Has No Expiry Filter

**File:** `src/repositories/user_session.repo.ts` — Line 78

```sql
SELECT * FROM user_sessions WHERE user_id = $1
```

This returns **all sessions including expired ones**. Add `AND expires_at > now()` to only return active sessions.

### LOGIC #5 — Login Success Message Says "User saved successfully"

**File:** `src/services/auth.service.ts` — Line 85

```typescript
"User saved successfully"; // misleading — this is a login response, not a creation
// Should be: "Login successful"
```

### LOGIC #6 — `verifyEmail` Code Length Check Is Off

**File:** `src/services/verify-email.service.ts` — Line 24

```typescript
if (!code || !email || code.length < 4)
```

A code of length exactly 4 passes this check. The check should be `code.length !== 4` to enforce the exact expected length.

### LOGIC #7 — Verification Token Expiry Could Be a Named Constant

**File:** `src/services/verify-email.service.ts` — Line 50

```typescript
const expires = issuedAt + 300000; // 5 minutes in ms — magic number
```

Move `300000` to `constants.ts` as `OTP_EXPIRY_MS = 5 * 60 * 1000` for clarity and easy change.

### LOGIC #8 — No Token Revocation Check on `revoked_at`

The `email_verification_tokens` table has a `revoked_at` column (visible in the `getUserCode` query), but the service never checks it. A revoked token will still be accepted as valid.

### LOGIC #9 — `getById` in Repo Does Not Return `password_hash`

**File:** `src/repositories/user.repo.ts` — Line 27

`getById` only selects `name, email, verified_at, profile_picture, id` — no `password_hash`. This is correct for general use, but means if you ever need to validate a password when only a user ID is known (e.g., change password flow), you'd have to look up by email first. This is fine architecturally — just make sure it's intentional.

---

## 5. Code Quality & Maintainability

### CODE #1 — `console.log` Used Everywhere Instead of the Pino Logger

The project has `pino` and `pino-http` installed and a `src/utils/logger/` directory, yet **every single file uses `console.log` for error logging**. Pino is a structured, high-performance logger that supports log levels (debug, info, warn, error) and outputs JSON perfect for log aggregation tools (Datadog, ELK, CloudWatch). Using `console.log` in production loses all these benefits. Migrate all logging to the Pino logger instance.

### CODE #2 — Typos in Code and Messages

| Location                                          | Typo                                             |
| ------------------------------------------------- | ------------------------------------------------ |
| `tokens.service.ts` line 7                        | `bcrpty` (import alias for bcrypt)               |
| `auth.service.ts` line 40                         | `vaildationError`                                |
| `reset-password.service.ts` line 55               | `"Invlaid email address"`                        |
| `user-session.service.ts` line 73                 | `"sucessfull"`                                   |
| `user_session.repo.ts` line 113                   | `"retreiveng"`                                   |
| `controllers/verfiyUser.controller.ts` — filename | `verfiy` → `verify`                              |
| `repositories/verify_email.repo.ts` — class name  | `EmailVerificatioRepo` → `EmailVerificationRepo` |
| `auth.service.ts` line 19                         | Dead string literal where import was removed     |

### CODE #3 — `any` Type Overused

Multiple catch blocks use `error: any` which defeats TypeScript's purpose. Use `unknown` and narrow the type:

```typescript
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ err: error }, "Context message");
}
```

### CODE #4 — Empty Class Constructors

Nearly every service and repository class has `constructor() {}`. These are redundant and add visual noise with no benefit. Remove them.

### CODE #5 — Services Unnecessarily Instantiated as Singletons via Classes

All services/repos are classes with a single exported instance (`const authServ = new AuthService()`). Since there's no instance state, these could simply be plain objects with methods or standalone exported functions. The class pattern here adds boilerplate without benefit. This is a style issue, not a bug, but worth considering for consistency.

### CODE #6 — `health.controller.ts` and `health.routes.ts` Are Empty

Both files are 0 bytes. A health/readiness check endpoint is essential for container orchestration (Kubernetes liveness/readiness probes, Docker Swarm health checks, load balancers). They should be implemented.

### CODE #7 — `cors.middleware.ts` Is Empty (0 bytes)

The CORS middleware file exists but has no content and is never applied.

### CODE #8 — `reset_password.repo.ts` (138 bytes) Appears Incomplete

This repository file is very small (138 bytes) and the password reset service doesn't use any repository — it calls `sendPasswordResetEmail` (which is empty) and never actually touches a password reset token table. The entire password reset token flow needs to be built.

### CODE #9 — `README.md` Is Essentially Empty (15 bytes)

The README only contains a placeholder. A production service should have: setup instructions, environment variable documentation, API endpoint documentation, and architecture overview.

---

## 6. Missing Features for Production

### FEAT #1 — No Password Reset Token/Link Flow

The current flow calls `sendPasswordResetEmail()` which does nothing, and `resetPassword()` never saves the new hash. A proper flow needs:

1. Generate a secure random reset token (e.g., `crypto.randomBytes(32).toString('hex')`)
2. Hash and store it in a `password_reset_tokens` table (schema exists: `reset_password.repo.ts`) with an expiry
3. Email a link to the user containing the token: `https://yourapp.com/reset-password?token=<rawToken>`
4. On the reset endpoint, look up the token, verify it hasn't expired/been used, then hash and save the new password and mark the token as used

### FEAT #2 — No Account Lockout After Failed Login Attempts

The rate limiter throttles by IP across all users, but there's no per-account lockout. An attacker on multiple IPs can still brute-force a specific account. Add a failed-login counter per email with a lockout threshold (e.g., 10 failures = 15-minute lockout).

### FEAT #3 — No Redis Integration (Despite Being Installed)

`redis` is listed as a dependency and is in the `redis` docker-compose block (commented out). Redis is ideal for:

- Rate limiting with sliding window per user (more accurate than IP-based)
- Caching session data to avoid DB lookups on every request
- Storing OTPs instead of hashing them into the DB

### FEAT #4 — No Refresh Token Expiry Enforcement

The `user_sessions` table has an `expires_at` column, but the token service never checks it. An expired refresh token would still generate a new access token.

### FEAT #5 — No Logout Endpoint That Clears Cookies

The `invalidateSession` endpoint deletes the DB record but doesn't clear the client-side cookies. The controller should add `.clearCookie('accessToken').clearCookie('refreshToken').clearCookie('deviceId')` to the response.

### FEAT #6 — No User Profile Endpoints

There are no endpoints to retrieve or update user profile information (`name`, `profile_picture`). The `updateUser` repo method exists but has broken SQL and is never called.

### FEAT #7 — Device Type Detection Unimplemented

**File:** `src/services/auth.service.ts` — Lines 59–60

```typescript
// TODO: Detect the user device type i.e mobile, browser etc
const deviceType = "";
```

Storing device type is important for session management UX (e.g., "Chrome on Windows", "iPhone App"). Use the `user-agent` header to detect this using a library like `ua-parser-js`.

### FEAT #8 — No Graceful Shutdown

`src/index.ts` starts the server but has no handling for `SIGTERM`/`SIGINT` signals. In a container environment (Docker, Kubernetes), the process manager sends `SIGTERM` before killing the process. Without a graceful shutdown handler, in-flight requests are dropped and database connections are abruptly closed.

```typescript
// Add to index.ts
const server = app.listen(...);
process.on('SIGTERM', () => {
  server.close(() => {
    pool.end(() => process.exit(0));
  });
});
```

### FEAT #9 — No Request ID / Correlation ID Tracking

There is no mechanism to trace a single request across all log lines. This makes debugging production issues very difficult. Attach a `X-Request-Id` header (or generate a UUID per request) and include it in every log line via `pino-http`.

### FEAT #10 — API Version Not Used in Routes

The `API_VERSION` env variable is read in `app.ts` but only used in a welcome message. The actual routes are mounted at `/api/v1/...` with the version hardcoded in the router files. Either make the version dynamic or remove the env variable.

---

## 7. Infrastructure & DevOps

### INFRA #1 — Dockerfile Runs `npm run dev` (nodemon) in Production

**File:** `dockerFile` — Line 13

```dockerfile
CMD [ "npm", "run", "dev" ]  # runs nodemon with tsx — development mode!
```

The production image should run the compiled output:

```dockerfile
CMD [ "node", "dist/src/index.js" ]
```

Also, the Dockerfile should use a **multi-stage build** to reduce image size:

1. Stage 1 (`builder`): Install all deps → compile TypeScript
2. Stage 2 (`runner`): Copy only `dist/` + `node_modules/` production deps → run

### INFRA #2 — No App Container in `compose.yaml`

The `compose.yaml` defines the `db` and `pgAdmin` containers but **not the application itself**. Developers cannot run the full stack with a single `docker compose up`. Add an `app` service that builds the Dockerfile.

### INFRA #3 — Redis Service Is Commented Out in compose.yaml

If Redis is installed as a dependency, it should be available for development. The commented-out block should be restored.

### INFRA #4 — `postgres:latest` Tag Is Unsafe

**File:** `compose.yaml` — Line 3

Using `latest` can cause unexpected breakages when the Postgres major version changes. Pin to a specific version, e.g., `postgres:16`.

### INFRA #5 — No `.dockerignore` for Key Directories

**File:** `.dockerignore` (52 bytes)

The file is very small. It should explicitly exclude: `node_modules`, `dist`, `.env`, `.git`, `coverage`, `__test__`, `*.md`, etc. to keep the Docker build context small and avoid copying sensitive files.

### INFRA #6 — No Health Check in Docker Compose

The `db` and `app` services should include a `healthcheck` block to signal when they are ready to receive traffic:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

---

## 8. Testing

The `__test__/` directory has sub-folders (`auth`, `email-verification`, `home`, `token-verification`, `user-session`) but they contain only `.gitkeep` files — there are **zero actual tests**.

For a production auth service, the following tests are critical:

| Test Category         | What to Cover                                                               |
| --------------------- | --------------------------------------------------------------------------- |
| **Unit Tests**        | All service methods, validation schemas, JWT generation/parsing             |
| **Integration Tests** | Full HTTP request → controller → service → DB flow using a test database    |
| **Auth Flow Tests**   | Signup → verify email → login → get access token → logout                   |
| **Security Tests**    | Rate limiting enforcement, invalid token rejection, expired token rejection |
| **Edge Cases**        | Duplicate signup, wrong password, expired OTP, invalid UUIDs                |

The project has `jest`, `supertest`, and `ts-jest` installed — just no tests written yet.

**Target coverage for production: ≥ 80%.**

---

## 9. What Is Done Well

Despite the issues above, the following aspects are genuinely solid:

- ✅ **Layered Architecture** — Clear separation of routes → controllers → services → repositories
- ✅ **Consistent Response Format** — `ApiResponse<T>` and `ApiError` classes used consistently throughout
- ✅ **Zod Validation** — Input validation with `zod` and `zod-validation-error` for readable error messages
- ✅ **Refresh Token Hashing** — SHA-256 hash of the refresh token stored in DB (correct approach)
- ✅ **JWT Best Practices** — Tokens have `issuer`, `audience`, `sub`, and short access token expiry (15m)
- ✅ **Soft Deletes** — `deleted_at` column pattern for users (data is never hard-deleted)
- ✅ **Database Transactions** — `setUserVerified` uses `BEGIN`/`COMMIT`/`ROLLBACK` correctly
- ✅ **Rate Limiting** — `express-rate-limit` applied on auth and signup routes
- ✅ **Helmet** — HTTP security headers applied via `helmet()`
- ✅ **TypeScript Strict Mode** — `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` in tsconfig
- ✅ **API Versioning** — Routes structured under `/api/v1/...`
- ✅ **Pool Connection Validation** — Server only starts after DB connection is confirmed in `index.ts`
- ✅ **Partial Index Awareness** — `partial-indexs.md` file shows awareness of DB optimization
- ✅ **Docker + Compose** — Containerization setup already started

---

## 10. Prioritized Roadmap to Production

### Phase 1 — Fix Critical Bugs (Blocker)

1. Fix the inverted try/catch in `requestResetPassword` controller
2. Fix refresh token validation in `tokens.service.ts` (hash comparison vs. JWT secret)
3. Implement actual password saving in `resetPassword` service
4. Fix `deleteAllSessions` SQL query (`user_id` not `id`)
5. Fix route registration missing leading slashes
6. Remove / fix the dead string literal import in `auth.service.ts`
7. Uncomment and implement `sendVerificationEmail`; implement `sendPasswordResetEmail`

### Phase 2 — Security Hardening (Critical)

1. Fix auth middleware to return 401/403 instead of 500
2. Attach decoded JWT to `req.user`, remove `userId` from req body/query on protected routes
3. Apply `authenticateUser` middleware to all session routes
4. Configure and apply CORS middleware
5. Replace `Math.random()` OTP with `crypto.randomInt()`
6. Add `sameSite` and `maxAge` to cookie options
7. Add `express.json({ limit: '16kb' })`
8. Remove `.env` from git history and rotate all secrets
9. Raise password max length to 64+

### Phase 3 — Complete Unfinished Features

1. Build the full password reset token flow (generate → email → validate → save)
2. Implement the health check endpoint
3. Implement CORS middleware
4. Implement device type detection from User-Agent
5. Add refresh token expiry check
6. Add `clearCookie` to logout endpoint
7. Implement user profile (GET/PATCH) endpoints
8. Fix `updateUser` SQL query in repository

### Phase 4 — Observability & Reliability

1. Replace all `console.log` with structured Pino logger
2. Add `X-Request-Id` correlation ID via `pino-http`
3. Add graceful shutdown handler (SIGTERM/SIGINT)
4. Add per-account login failure counter with lockout

### Phase 5 — Infrastructure

1. Change Dockerfile `CMD` to run compiled output, create multi-stage build
2. Add app service to `compose.yaml`
3. Restore Redis service in `compose.yaml`
4. Pin `postgres:latest` to a pinned version (e.g., `postgres:16`)
5. Improve `.dockerignore`
6. Add Docker health checks

### Phase 6 — Testing

1. Write unit tests for all service methods
2. Write integration tests for all HTTP endpoints
3. Set up CI pipeline (GitHub Actions) that runs tests on every push
4. Target ≥ 80% code coverage

### Phase 7 — Documentation

1. Write comprehensive `README.md` (setup, env vars, API docs, architecture)
2. Add OpenAPI/Swagger documentation for the API
3. Remove the plaintext OTP `console.log` from all code paths

---

_This review was generated by static code analysis of the repository as of 2026-03-03. No code changes were made — this is a read-only audit._
