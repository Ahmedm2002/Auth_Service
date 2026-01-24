import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 10,
});

pool
  .connect()
  .then((client) => {
    console.log("Database connected");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection error", err.message);
  });
export { pool };
