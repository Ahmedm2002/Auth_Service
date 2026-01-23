import * as z from "zod";
import { emailSchema, passwordSchema, userNameSchema } from "../schemas.js";

const signupSchema = z.object({
  email: emailSchema,
  userName: userNameSchema,
  password: passwordSchema,
});

export default signupSchema;
