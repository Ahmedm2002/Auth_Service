import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
  base: {
    pid: true,
  },
  redact: {
    paths: [
      "password",
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie",
      "email",
    ],
  },
});

export default logger;
