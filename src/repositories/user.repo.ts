import { pool } from "../configs/db.js";
import type { userI } from "../models/user.model.js";

class Users {
  constructor() {}

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
      console.log("Error creating user", error.message);
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

    try {
      const result = await pool.query(
        `Update users set where id = $1 RETURNING *`,
        [userId]
      );
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
}

export default Users;
