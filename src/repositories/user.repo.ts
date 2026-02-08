import { pool } from "../configs/db.js";
import type { userI } from "../models/user.model.js";

class Users {
  constructor() {}

  whiteListedCols: string[] = [
    "name",
    "password_hash",
    "profile_picture",
    "last_login_at",
    "updated_on",
    "verified_at",
  ];
  async getById(userId: string) {
    if (!userId) return null;
    try {
      const result = await pool.query(
        "Select name, email, verified_at, profile_picture, id from users where id = $1 AND deleted_at IS  NULL",
        [userId]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.log("Error occured while retrieving user by id", error.message);
    }
  }

  async getByEmail(email: string) {
    if (!email) return null;
    try {
      const result = await pool.query(
        "Select name, email, verified_at, profile_picture, password_hash, id from users where email = $1 AND deleted_at IS  NULL",
        [email]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.log("Error occured while retrieving user by id", error.message);
    }
  }

  async createUser(user: userI) {
    if (!user) return null;
    const { name, email, password_hash } = user;
    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, verified_at, created_on`,
        [name, email, password_hash]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.log("Error while creating user", error.message);
    }
  }
  async updateUser(updateFields: string[], values: string[], userId: string) {
    // fields that will be allowed to updated by user

    // - name
    // - password_hash
    // - profile_picture
    // - last_login_at
    // - updated_on
    // - verified_at
    const query = updateFields.map((field, index) => `${index + 1}`);
    const queryText = `Update users set () ${query} where id = $1`;
    try {
      const result = await pool.query(queryText, [userId, values]);
      return result.rows[0] || null;
    } catch (error: any) {
      console.log("Error updating user", error.message);
    }
  }
  async deleteUser(userId: string) {
    if (!userId) return null;
    try {
      const result = await pool.query(
        "Update users set deleted_at = $1 where id = $2",
        [new Date(), userId]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      console.log("Error soft deleting user", error.message);
    }
  }
  async setUserVerified(userId: string, tokenId: string) {
    if (!userId) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE users
       SET verified_at = now()
       WHERE id = $1
       AND verified_at is NULL
       `,
        [userId]
      );

      await client.query(
        `UPDATE email_verification_tokens
       SET used_at = now()
       WHERE id = $1
       AND used_at is NULL
       `,
        [tokenId]
      );

      await client.query("COMMIT");
    } catch (error: any) {
      console.log("Error in updated user status to verified: ", error.message);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
  async getAllUsers() {
    try {
      const result = await pool.query("SELECT * FROM users");
      return result.rows;
    } catch (error: any) {
      console.log("Error fetching all users", error.message);
    }
  }
}

const user = new Users();
export default user as Users;
