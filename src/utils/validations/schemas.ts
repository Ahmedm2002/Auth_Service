import * as z from "zod";

const emailSchema = z.email({ message: "Invalid email address" });

const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters long");

const userNameSchema = z.string().trim().min(3, "Invalid user name");

export { emailSchema, passwordSchema, userNameSchema };
