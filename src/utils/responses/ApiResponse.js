/**
 * @param {boolean} statusCode - represents http status code for the request
 * @param {any} data - requested data by request
 * @param {boolean} message - message for brief summary of action i.e "login successful" to be shown in ui
 */
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
