import * as z from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Invalid Email")
  .min(1, "Email is required");

const passwordSchema = z
  .string()
  .trim()
  .min(8, "Invalid Password")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  );

const userNameSchema = z.string().trim().min(3, "Invalid user name");

export { emailSchema, passwordSchema, userNameSchema };
