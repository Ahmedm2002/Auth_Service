import express, { type Express } from "express";
import router from "./routes/index.js";
import dotenv from "dotenv";
import ApiResponse from "./utils/responses/ApiResponse.js";
import ApiError from "./utils/responses/ApiError.js";

dotenv.config();

const apiVersion = process.env.API_VERSION;
console.log("Api Version: ", apiVersion);

const app: Express = express();

app.use(express.json());
app.use(`/api/${apiVersion}`, router);

app.get(`/api/${apiVersion}`, (req, res) => {
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
