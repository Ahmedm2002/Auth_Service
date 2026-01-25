import express, { type Express } from "express";
import router from "./routes/index.js";
import dotenv from "dotenv";

dotenv.config();

const apiVersion = process.env.API_VERSION;
console.log("Api Version: ", apiVersion);

const app: Express = express();

app.use(express.json());
app.use(`/api/${apiVersion}`, router);

app.get(`/api/${apiVersion}`, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to file sharing backend",
    statusCode: 200,
    apiVersion: apiVersion,
  });
});

export { app };
