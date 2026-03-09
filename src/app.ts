import express, { type Express } from "express";
import v1Router from "./router/v1/index.js";
import dotenv from "dotenv";
import ApiResponse from "./utils/responses/ApiResponse.js";
import transport from "./configs/nodemailer.js";
import helmet from "helmet";
("pino-http");
import logger from "./utils/logger/logger.js";
import logRequest from "./middlewares/logger.middleware.js";
import corsMiddleware from "./middlewares/cors.middleware.js";

dotenv.config();

const apiVersion = process.env.API_VERSION;

const app: Express = express();
app.use(express.static("public/"));
app.use(helmet());
app.use(corsMiddleware);

transport.verify();
app.use(express.json({ limit: "16kb" }));
app.use(logRequest);
app.use(`/api`, v1Router);

app.get("/api/", (req, res) => {
  logger.info("/GET successfull");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { version: apiVersion },
        "Welcome to auth service backend",
      ),
    );
});

export { app };
