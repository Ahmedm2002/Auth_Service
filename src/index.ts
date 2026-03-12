import dotenv from "dotenv";
import { app } from "./app.js";
import { pool } from "./configs/db.js";
import logger from "./utils/logger/logger.js";

dotenv.config();

pool
  .connect()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      logger.info({ port: process.env.PORT || 3000 }, "Server started");
    });
  })
  .catch((err: any) => {
    logger.fatal({ err }, "Database connection failed — server will not start");
    process.exit(1);
  });

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  pool.end(() => {
    logger.info("Database pool closed");
    process.exit(0);
  });
});
