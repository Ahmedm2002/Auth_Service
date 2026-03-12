import { pool } from "../configs/db.js";
import type { userI } from "../interfaces/user.model.js";
import type { QueryResult } from "pg";
import logger from "../utils/logger/logger.js";

/**
 *
 */
class UsersRepo {
  constructor() {}

  /**
   *
   * @param userId
   * @returns
   */
  async getById(userId: string): Promise<userI> {
    try {
      const result: QueryResult = await pool.query(
        "Select name, email, verified_at, profile_picture, id from users where id = $1 AND deleted_at IS NULL",
        [userId],
      );
      return result.rows[0] ?? null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get user by id");
      throw new Error("Error retreving user by id");
    }
  }

  /**
   *
   * @param email
   * @returns
   */
  async getByEmail(email: string): Promise<userI> {
    try {
      const result: QueryResult = await pool.query(
        "Select name, email, verified_at, profile_picture, password_hash, id from users where email = $1 AND deleted_at IS NULL",
        [email],
      );
      return result.rows[0] ?? null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get user by email");
      throw new Error("Error retrieving user by email");
    }
  }

  /**
   *
   * @param user
   * @returns
   */
  async createUser(
    user: Pick<userI, "name" | "password_hash" | "email">,
  ): Promise<userI> {
    const { name, email, password_hash } = user;
    try {
      const result: QueryResult = await pool.query(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, verified_at, created_on`,
        [name, email, password_hash],
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error({ err: error }, "Failed to create user");
      throw new Error("Error creating user");
    }
  }

  async updatePassword(userId: string, updatedPasswordHash: string) {
    try {
      const result: QueryResult = await pool.query(
        "Update users set password_hash = $1 where id = $2 returning id",
        [updatedPasswordHash, userId],
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error({ err: error }, "Failed to update user password");
      throw new Error("Error updating user password");
    }
  }

  async updateLastLogin(userId: string) {
    try {
      const result: QueryResult = await pool.query(
        "UPDATE users SET last_login_at = now() WHERE id = $1 RETURNING id",
        [userId]
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error({ err: error }, "Failed to update last login");
      throw new Error("Error updating user last login timestamp");
    }
  }

  /**
   *
   * @param userId
   * @returns
   */
  async deleteUser(userId: string): Promise<userI> {
    try {
      const result: QueryResult = await pool.query(
        "Update users set deleted_at = $1 where id = $2",
        [new Date(), userId],
      );
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error({ err: error }, "Failed to soft-delete user");
      throw new Error("Error deleting user");
    }
  }
  /**
   *
   * @param userId
   * @param tokenId
   * @returns
   */
  async setUserVerified(userId: string, tokenId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE users
       SET verified_at = now()
       WHERE id = $1
       AND verified_at is NULL
       `,
        [userId],
      );

      await client.query(
        `UPDATE email_verification_tokens
       SET used_at = now()
       WHERE id = $1
       AND used_at is NULL
       `,
        [tokenId],
      );

      await client.query("COMMIT");
    } catch (error: any) {
      logger.error({ err: error }, "Failed to set user verified");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
}

const Users = new UsersRepo();
export default Users;
