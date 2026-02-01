/**
 *
 * @param statusCode boolean
 * @param message string
 * @param success bolean
 * @param errors string[]
 * @param stack any
 */

class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack) {
    super();
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
