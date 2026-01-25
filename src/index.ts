import dotenv from "dotenv";
import { app } from "./app.js";
import { pool } from "./configs/db.js";
import insertData from "./quries/insert.query.js";

dotenv.config();

pool
  .connect()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server started at http://localhost:${process.env.PORT}`);
    });

    let resutlt: any;
    insertData("test_table", "name, description", [
      "Test Name",
      "Test description",
    ]).then((res) => {
      resutlt = res;
      console.log("Insertion results: ", resutlt);
    });
    console.log("Insertion results: ", resutlt);
  })
  .catch((err: any) => {
    console.log("Database connection failed: ", err);
  });
