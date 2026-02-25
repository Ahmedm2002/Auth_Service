import * as z from "zod";
import { emailSchema, passwordSchema, userNameSchema } from "../schemas.js";
import { createErrorMap } from "zod-validation-error";

z.config({
  customError: createErrorMap,
});

const signupSchema = z.object({
  email: emailSchema,
  userName: userNameSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export { loginSchema, signupSchema };
