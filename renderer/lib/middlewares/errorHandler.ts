import { NextApiRequest, NextApiResponse } from 'next';
import { APIError } from '@/lib/errors/APIError';

/**
 * Middleware that wraps API handlers with standardized error handling
 * @param handler - The API route handler function
 * @returns A wrapped handler function with error handling
 */
export const withErrorHandler = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Generate a unique request ID for tracing
    const requestId = Math.random().toString(36).substring(2, 15);
    
    try {
      // Add the request ID to the request object for logging
      (req as any).requestId = requestId;
      
      // Call the original handler
      return await handler(req, res);
    } catch (err) {
      console.error(`[API] Error (${requestId}):`, err);
      
      if (err instanceof APIError) {
        return res.status(err.statusCode).json({
          error: {
            message: err.message,
            statusCode: err.statusCode,
            requestId
          }
        });
      }
      
      // Handle generic errors
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          details: err.message,
          statusCode: 500,
          requestId
        }
      });
    }
  };
};
