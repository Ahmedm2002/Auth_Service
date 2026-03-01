import dotenv from "dotenv";
import { app } from "./app.js";
import { pool } from "./configs/db.js";

dotenv.config();

pool
  .connect()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server started at http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err: any) => {
    console.log("Database connection failed: ", err);
  });
