/**
 * Custom error class for API related errors.
 * Extends the standard Error class with status code functionality.
 * For server-side use only.
 */
export class APIError extends Error {
  public statusCode: number;
  public details?: any;
  public code?: string;

  /**
   * Creates a new APIError instance
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param details - Optional additional error details
   * @param code - Optional error code for client-side handling
   */
  constructor(message: string, statusCode: number = 500, details?: any, code?: string) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    
    // Maintains proper stack trace for where the error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Serializes the error to a JSON-friendly format
   * Used when sending error responses to clients
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        code: this.code,
        details: this.details
      }
    };
  }
}
