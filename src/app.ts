import express, { type Express } from "express";

const app: Express = express();

import authRoutes from "./routes/auth.routes.js";

app.use(express.json());
app.use("/auth", authRoutes);

export default app;
