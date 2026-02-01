import { pool } from "../configs/db.js";

async function insertData(table: string, fields: string, values: string[]) {
  if (!table || !fields || !values) {
    return "Values not provided for insertion";
  }
  try {
    const query = `INSERT INTO ${table} (${fields})  RETURNING *`;
    const results = await pool.query(query, values);
    return results;
  } catch (error: any) {
    console.log("Error inserting values in ", table, " ", error.message);
    return "Error while inserting values";
  }
}

export default insertData;
