import express, { type Express } from "express";
import router from "./routes/index.js";
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
// app.all("*", (req: Request, res: Response) => {
//   return res.status(404).json(new ApiError(404, "Route not found"));
// });

// app.all("*", (req, res) => {
//   return res.status(404).json(new ApiError(404, "Route not found"));
// });
export { app };
