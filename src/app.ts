import express, { type Express } from "express";
import v1Router from "./router/v1/index.js";
import dotenv from "dotenv";
import ApiResponse from "./utils/responses/ApiResponse.js";
import transport from "./configs/nodemailer.js";
import helmet from "helmet";

dotenv.config();

const apiVersion = process.env.API_VERSION;

const app: Express = express();
app.use(express.static("public/"));
app.use(helmet());

transport.verify();
app.use(express.json());
app.use(`/api/`, v1Router);

app.get("/api/", (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { version: apiVersion },
        "Welcome to auth service backend"
      )
    );
});

export { app };
