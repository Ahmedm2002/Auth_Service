import uuidSchema from "../validations/Zod/uuid.schema.js";
/**
 *
 * @param {string} uuid
 * @returns {boolean} returns true if the uuid is valid
 */
function isValidUuid(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

export default isValidUuid;
