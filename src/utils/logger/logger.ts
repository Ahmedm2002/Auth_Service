import pino from "pino";

const ENV = process.env.NODE_ENV;
console.log("ENVIRONMENT: ", ENV);
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss.l o",
            ignore: "pid,hostname",
          },
        }
      : {
          target: "pino/file",
          options: {
            destination: "logs/app.log",
          },
        },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "password",
    "token",
    "refreshToken",
    "accessToken",
  ],
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: false,
    hostname: false,
  },
});

export default logger;
