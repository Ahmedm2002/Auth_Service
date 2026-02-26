import uuidSchema from "../validations/Zod/uuid.schema.js";
/**
 *
 * @param uuid
 * @returns
 */
function isValidUuid(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

export default isValidUuid;
