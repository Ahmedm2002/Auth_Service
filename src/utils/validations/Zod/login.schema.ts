import * as z from "zod";
import { emailSchema, passwordSchema } from "../schemas.js";

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default loginSchema;
