import rateLimit from "express-rate-limit";

class RateLimiter {
  constructor() {}
  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  signupLimiter = rateLimit({
    windowMs: 10 * 60 * 60 * 1000,
    max: 20,
    message: "Too many accounts created, please try again later",
  });
}

const rateLimiter = new RateLimiter();
export default rateLimiter as RateLimiter;
