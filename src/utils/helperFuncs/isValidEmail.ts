import { emailSchema } from "../validations/schemas.js";

/**
 *
 * @param email
 * @returns
 */
function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export default isValidEmail;
