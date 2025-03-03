# API Middleware Usage Guide

This document explains how to use the middleware system for API routes in the Waterfall Tool.

## Available Middleware

We have three main middleware components:

1. `withErrorHandler` - Handles errors and standardizes error responses
2. `withLogging` - Provides request/response logging and timing
3. `withAPI` - Combines both error handling and logging (recommended for most API routes)

## Basic Usage

### Using Combined Middleware (Recommended)

```typescript
// pages/api/your-route.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPI, logger } from '@/lib/middlewares';
import { APIError } from '@/lib/errors/APIError';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const requestId = (req as any).requestId || 'unknown';
  
  // The logger is automatically available and includes the request ID
  logger.info(requestId, 'Processing your-route request');
  
  switch (method) {
    case 'GET':
      // Your GET logic here
      return res.status(200).json({ success: true, data: [] });
      
    case 'POST':
      // Your POST logic here
      // If something fails, just throw an APIError
      if (!req.body.requiredField) {
        throw new APIError('Missing required field', 400);
      }
      
      return res.status(201).json({ success: true });
      
    default:
      // This will be caught and handled properly
      throw new APIError(`Method ${method} Not Allowed`, 405);
  }
}

// Export with the combined middleware
export default withAPI(handler);
```

### Using Individual Middleware

If you need only error handling or only logging:

```typescript
import { withErrorHandler } from '@/lib/middlewares';

// Only error handling
export default withErrorHandler(handler);
```

```typescript
import { withLogging } from '@/lib/middlewares';

// Only logging
export default withLogging(handler);
```

## Error Handling

The `APIError` class can be used to throw structured errors:

```typescript
// Basic usage
throw new APIError('Something went wrong', 400);

// With additional details
throw new APIError(
  'Validation failed', 
  422, 
  { fields: ['name', 'email'] },
  'VALIDATION_ERROR'
);
```

## Logging

The `logger` utility can be used directly in your code:

```typescript
import { logger } from '@/lib/middlewares';

// Get the request ID from the request object
const requestId = (req as any).requestId;

// Different log levels
logger.debug(requestId, 'Debugging information', { someData: 'value' });
logger.info(requestId, 'Information message');
logger.warn(requestId, 'Warning message');
logger.error(requestId, 'Error occurred', error);
```

## Best Practices

1. Always use `withAPI` for new API routes
2. Throw `APIError` instances instead of returning error responses manually
3. Include the request ID in all manual log calls
4. Keep sensitive information out of logs (passwords, tokens, etc.)
5. Add appropriate status codes to your errors
