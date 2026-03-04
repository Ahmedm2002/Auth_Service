import pino, { levels } from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname,reqId,action,statusCode,duration",
      messageFormat: "[{reqId}] {action} {msg} {statusCode} {duration}",
      translateTime: "yyyy-mm-dd HH:MM:ss.l",
      singleLine: true,
    },
  },

  base: {
    pid: true,
  },
  formatters: {
    level: (label, number) => {
      return { level: label.toUpperCase() };
    },
  },

  // transport: {},
});

export default logger;
