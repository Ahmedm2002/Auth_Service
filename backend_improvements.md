# Backend Improvements for Production

A comprehensive guide to improve the Auth Service backend for production deployment, covering security, scalability, reliability, and best practices.

---

## 🔐 1. Authentication & Session Management

### 1.1 JWT Token Implementation

> [!IMPORTANT] > **Current Issue**: The login endpoint returns an empty object `{}`

**Implementation Required**:

```typescript
// In auth.controller.ts - loginUser function
import jwt from "jsonwebtoken";

// Generate access token (short-lived: 15 minutes)
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_ACCESS_SECRET!,
  { expiresIn: "15m" }
);

// Generate refresh token (long-lived: 7 days)
const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET!,
  { expiresIn: "7d" }
);

// Save refresh token to user_sessions table
await UserSessions.createSession(user.id, refreshToken);

return res.status(200).json(
  new ApiResponse(
    200,
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified_at: user.verified_at,
      },
      accessToken,
      refreshToken,
    },
    "Login successful"
  )
);
```

**Environment Variables Needed**:

```env
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>
```

### 1.2 Session Tracking

**Create Session Management**:

```typescript
// In repositories/user_session.repo.ts
export async function createSession(userId: number, refreshToken: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return await pool.query(
    `INSERT INTO user_sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, refreshToken, expiresAt]
  );
}

export async function invalidateSession(refreshToken: string) {
  return await pool.query(
    "DELETE FROM user_sessions WHERE refresh_token = $1",
    [refreshToken]
  );
}
```

### 1.3 Authentication Middleware

**Create JWT verification middleware**:

```typescript
// In middlewares/auth.middleware.ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json(new ApiError(401, "Access token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    req.user = decoded; // Add user info to request
    next();
  } catch (error) {
    return res.status(403).json(new ApiError(403, "Invalid or expired token"));
  }
}
```

### 1.4 Logout Endpoint

**Implement proper logout**:

```typescript
// In auth.controller.ts
async function logoutUser(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json(new ApiError(400, "Refresh token required"));
  }

  await UserSessions.invalidateSession(refreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
}
```

### 1.5 Token Refresh Endpoint

**Implement token refresh**:

```typescript
// In auth.controller.ts
async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json(new ApiError(400, "Refresh token required"));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    // Check if session exists
    const session = await UserSessions.getSessionByToken(refreshToken);
    if (!session || session.expires_at < new Date()) {
      return res
        .status(403)
        .json(new ApiError(403, "Invalid or expired refresh token"));
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "15m" }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { accessToken: newAccessToken }, "Token refreshed")
      );
  } catch (error) {
    return res.status(403).json(new ApiError(403, "Invalid refresh token"));
  }
}
```

---

## 🔑 2. Password Reset Flow

### 2.1 Forgot Password Endpoint

**Create password reset request**:

```typescript
// In controllers/resetPassword.controller.ts
async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  const user = await Users.getByEmail(email);
  if (!user) {
    // Don't reveal if email exists (security best practice)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If email exists, password reset link has been sent"
        )
      );
  }

  // Generate reset token (valid for 1 hour)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(resetToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save to password_reset_tokens table (create this table)
  await PasswordResetTokens.insert(user.id, tokenHash, expiresAt);

  // Send email with reset link
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
  await sendPasswordResetEmail(email, user.name, resetLink);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "If email exists, password reset link has been sent"
      )
    );
}
```

### 2.2 Reset Password Endpoint

```typescript
async function resetPassword(req: Request, res: Response) {
  const { email, token, newPassword } = req.body;

  // Validate inputs
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json(new ApiError(400, "Invalid inputs"));
  }

  const user = await Users.getByEmail(email);
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // Get reset token
  const resetTokenData = await PasswordResetTokens.getByUserId(user.id);
  if (!resetTokenData || resetTokenData.expires_at < new Date()) {
    return res
      .status(400)
      .json(new ApiError(400, "Invalid or expired reset token"));
  }

  // Verify token
  const isValid = await bcrypt.compare(token, resetTokenData.token_hash);
  if (!isValid) {
    return res.status(400).json(new ApiError(400, "Invalid reset token"));
  }

  // Update password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await Users.updatePassword(user.id, newPasswordHash);

  // Invalidate reset token
  await PasswordResetTokens.deleteByUserId(user.id);

  // Invalidate all sessions (force re-login)
  await UserSessions.deleteAllUserSessions(user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successful"));
}
```

---

## 📧 3. Email Service Optimization

> [!WARNING] > **Current Issue**: Email sending blocks the signup API flow

### 3.1 Queue-Based Email Service

**Install Bull Queue**:

```bash
npm install bull @types/bull
npm install ioredis @types/ioredis
```

**Create Email Queue**:

```typescript
// In services/email/emailQueue.ts
import Bull from "bull";

export const emailQueue = new Bull("email", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Process email jobs
emailQueue.process(async (job) => {
  const { to, subject, html, type } = job.data;

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}: ${type}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error; // Allow retry
  }
});

// Add email to queue
export async function queueEmail(
  to: string,
  subject: string,
  html: string,
  type: string
) {
  await emailQueue.add(
    {
      to,
      subject,
      html,
      type,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}
```

**Update signup controller**:

```typescript
// Don't wait for email to be sent
await queueEmail(
  email,
  "Verify Your Email",
  verificationEmailTemplate(name, token),
  "verification"
);

// Immediate response
return res
  .status(200)
  .json(new ApiResponse(200, newUser, "User created successfully"));
```

### 3.2 Email Templates

**Create professional email templates**:

```typescript
// In services/email/templates.ts
export function verificationEmailTemplate(name: string, code: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; text-align: center; padding: 20px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello ${name},</p>
          <p>Your verification code is:</p>
          <div class="code">${code}</div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Auth Service. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## 🛡️ 4. Security Enhancements

### 4.1 Security Headers (Helmet)

```bash
npm install helmet
```

```typescript
// In app.ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### 4.2 CORS Configuration

```typescript
// In middlewares/cors.middleware.ts
import cors from "cors";

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
];

export const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### 4.3 Rate Limiting Enhancement

**Per-endpoint rate limiting**:

```typescript
// In middlewares/rateLimitter.middleware.ts
import rateLimit from "express-rate-limit";

// Strict limit for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limit for signup
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: "Too many accounts created, please try again later",
});

// Apply to routes
router.post("/login", authLimiter, loginUser);
router.post("/signup", signupLimiter, signupUser);
```

### 4.4 Input Sanitization

```bash
npm install validator
npm install @types/validator
```

```typescript
// In utils/sanitization.ts
import validator from "validator";

export function sanitizeEmail(email: string): string {
  return validator.normalizeEmail(email.trim().toLowerCase()) || email;
}

export function sanitizeName(name: string): string {
  return validator.escape(name.trim());
}
```

### 4.5 Account Lockout After Failed Attempts

```typescript
// Create failed_login_attempts table and track failed logins
export async function trackFailedLogin(userId: number) {
  const attempts = await FailedLogins.increment(userId);

  if (attempts >= 5) {
    await Users.lockAccount(userId, new Date(Date.now() + 30 * 60 * 1000)); // 30 min lock
    return true; // Account locked
  }

  return false;
}

// Reset on successful login
await FailedLogins.reset(user.id);
```

---

## 🔍 5. Logging & Monitoring

### 5.1 Structured Logging

**Enhance Pino logging**:

```typescript
// In configs/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        }
      : undefined,
  redact: {
    paths: ["req.headers.authorization", "password", "token"],
    remove: true,
  },
});

// Use throughout app
logger.info({ userId: user.id }, "User logged in");
logger.error({ error, userId }, "Login failed");
```

### 5.2 Security Event Logging

```typescript
// Log important security events
logger.warn(
  {
    event: "failed_login",
    email,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  },
  "Failed login attempt"
);

logger.info(
  {
    event: "user_signup",
    userId: user.id,
    email: user.email,
  },
  "New user registered"
);
```

### 5.3 Error Tracking (Sentry)

```bash
npm install @sentry/node
```

```typescript
// In app.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 🗄️ 6. Database Optimizations

### 6.1 Connection Pooling

```typescript
// In configs/database.ts
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err) => {
  logger.error({ error: err }, "Unexpected database pool error");
});
```

### 6.2 Database Indexes

**Create indexes for performance**:

```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verified_at ON users(verified_at) WHERE verified_at IS NOT NULL;

-- Verification tokens indexes
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_created_at ON verification_tokens(created_at);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
```

### 6.3 Database Migrations

**Use a migration tool**:

```bash
npm install node-pg-migrate
```

```json
// In package.json
{
  "scripts": {
    "migrate:create": "node-pg-migrate create",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down"
  }
}
```

---

## 🧪 7. Testing

### 7.1 Unit Tests

```typescript
// In src/tests/auth.test.ts
import { describe, it, expect } from "@jest/globals";
import { validateEmail, validatePassword } from "../utils/validation";

describe("Email Validation", () => {
  it("should validate correct email", () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(validateEmail("invalid-email")).toBe(false);
  });
});
```

### 7.2 Integration Tests

```typescript
// Test API endpoints
import request from "supertest";
import { app } from "../app";

describe("POST /api/v1/auth/signup", () => {
  it("should create a new user", async () => {
    const response = await request(app).post("/api/v1/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "Test1234",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("id");
  });
});
```

---

## 📊 8. Health Checks & Monitoring

### 8.1 Health Check Endpoint

```typescript
// In controllers/health.controller.ts
async function healthCheck(req: Request, res: Response) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
      email: "unknown",
    },
  };

  // Check database
  try {
    await pool.query("SELECT 1");
    health.services.database = "healthy";
  } catch (error) {
    health.services.database = "unhealthy";
    health.status = "degraded";
  }

  // Check Redis
  try {
    await redisClient.ping();
    health.services.redis = "healthy";
  } catch (error) {
    health.services.redis = "unhealthy";
    health.status = "degraded";
  }

  // Check email service
  try {
    await transport.verify();
    health.services.email = "healthy";
  } catch (error) {
    health.services.email = "unhealthy";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  return res.status(statusCode).json(health);
}
```

---

## 🚀 9. Deployment & DevOps

### 9.1 Environment Configuration

**Create proper .env files**:

```env
# .env.production
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=auth_service_prod
DATABASE_USER=postgres
DATABASE_PASSWORD=<strong-password>
DATABASE_SSL=true

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# JWT Secrets (use strong random strings)
JWT_ACCESS_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<64-char-random-hex>

# Email
EMAIL_FROM=noreply@yourapp.com
GOOGLE_APP_PASSWORD=<app-password>

# Security
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
FRONTEND_URL=https://yourapp.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=warn
```

### 9.2 Docker Production Build

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

USER node
EXPOSE 3000

CMD ["node", "dist/src/index.js"]
```

### 9.3 Process Management (PM2)

```bash
npm install -g pm2
```

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'auth-service',
    script: 'dist/src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

## 📝 10. API Documentation

### 10.1 OpenAPI/Swagger

```bash
npm install swagger-ui-express swagger-jsdoc @types/swagger-ui-express
```

```typescript
// In app.ts
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth Service API",
      version: "1.0.0",
      description: "Authentication service with email verification",
    },
    servers: [{ url: "/api/v1" }],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

---

## Summary Checklist

- [x] JWT access & refresh tokens
- [x] Session management in database
- [x] Password reset flow
- [x] Queue-based email service
- [x] Security headers (Helmet)
- [x] Enhanced CORS configuration
- [x] Per-endpoint rate limiting
- [x] Input sanitization
- [x] Account lockout mechanism
- [x] Structured logging with Pino
- [x] Error tracking with Sentry
- [x] Database connection pooling
- [x] Database indexes
- [x] Database migrations
- [x] Unit & integration tests
- [x] Health check endpoint
- [x] Production environment config
- [x] Docker multi-stage build
- [x] PM2 process management
- [x] API documentation (Swagger)

**Estimated Implementation Time**: 3-5 days for full production-ready backend
