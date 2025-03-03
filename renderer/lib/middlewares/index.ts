/**
 * Export all middleware for easier imports
 */

import { withErrorHandler } from './errorHandler';
import { withLogging, logger, LogLevel } from './loggingMiddleware';

// Re-export for external use
export { withErrorHandler, withLogging, logger, LogLevel };

/**
 * Combines multiple middleware functions into a single middleware
 * @param middlewares - Array of middleware functions to combine
 */
export const combineMiddleware = (...middlewares: any[]) => {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler);
  };
};

/**
 * Combined middleware with both logging and error handling
 * Apply this to your API routes for complete request/response logging and error handling
 */
export const withAPI = combineMiddleware(withErrorHandler, withLogging);
