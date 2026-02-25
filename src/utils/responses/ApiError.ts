/**
 *
 * @param {boolean} statusCode
 * @param {string} message
 * @param {boolean} success
 * @param {string[]} errors
 * @param {any} stack
 */

class ApiError extends Error {
  statusCode: number;
  data: null;
  success: boolean;
  errors: any;

  constructor(statusCode: number, message: string, errors?: any, stack?: any) {
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
