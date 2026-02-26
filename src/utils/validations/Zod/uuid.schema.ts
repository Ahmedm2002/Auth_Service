import * as z from "zod";
import { createErrorMap } from "zod-validation-error";

z.config({
  customError: createErrorMap(),
});

const uuidSchema = z.uuid();

export default uuidSchema;
