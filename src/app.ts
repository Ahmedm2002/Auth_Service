import express, { type Express } from "express";
import authRoutes from "./routes/auth.routes.js";

const app: Express = express();

app.use(express.json());
app.use("/auth", authRoutes);

export { app };
