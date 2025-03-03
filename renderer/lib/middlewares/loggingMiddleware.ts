import { NextApiRequest, NextApiResponse } from 'next';
import _ from 'lodash';

/**
 * Log levels for different types of log messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Color codes for console logging
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Interface for extending the NextApiResponse with logging
 */
interface LoggingResponse extends NextApiResponse {
  locals?: {
    startTime: number;
    requestId: string;
    responseBody?: any; // Store the response body for logging
  };
}

/**
 * Generates a random request ID
 */
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Formats a log message with timestamp, level, and content
 */
const formatLogMessage = (level: LogLevel, requestId: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  let color = colors.blue;

  switch (level) {
    case LogLevel.DEBUG:
      color = colors.gray;
      break;
    case LogLevel.INFO:
      color = colors.green;
      break;
    case LogLevel.WARN:
      color = colors.yellow;
      break;
    case LogLevel.ERROR:
      color = colors.red;
      break;
  }

  let logMessage = `${color}[${timestamp}] [${level}] [${requestId}] ${message}${colors.reset}`;

  if (data) {
    // Safely handle circular references in objects
    const safeData = typeof data === 'object'
      ? JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (key === 'req' || key === 'res') return '[Object]';
        }
        return value;
      }, 2)
      : data;

    logMessage += `\n${colors.gray}${safeData}${colors.reset}`;
  }

  return logMessage;
};

/**
 * Logger utility for API endpoints
 */
export const logger = {
  debug: (requestId: string, message: string, data?: any) => {
    console.debug(formatLogMessage(LogLevel.DEBUG, requestId, message, data));
  },

  info: (requestId: string, message: string, data?: any) => {
    console.log(formatLogMessage(LogLevel.INFO, requestId, message, data));
  },

  warn: (requestId: string, message: string, data?: any) => {
    console.warn(formatLogMessage(LogLevel.WARN, requestId, message, data));
  },

  error: (requestId: string, message: string, data?: any) => {
    console.error(formatLogMessage(LogLevel.ERROR, requestId, message, data));
  }
};

/**
 * Safely extracts a subset of the request for logging
 */
const getLoggableRequest = (req: NextApiRequest) => {
  const { method, url } = req;
  
  // Create safe deep copies of potentially sensitive objects using Lodash
  const headers = _.cloneDeep(req.headers);
  const query = _.cloneDeep(req.query);
  
  // Don't log body for GET/HEAD requests, and sanitize sensitive data for others
  const body = ['GET', 'HEAD'].includes(method || '')
    ? undefined
    : sanitizeRequestBody(req.body);
  
  // Redact any sensitive headers (like Authorization)
  redactSensitiveData(headers);

  return { headers, method, url, query, body };
};

/**
 * List of sensitive fields to redact
 */
const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'key', 'authorization', 'credential', 'auth'];

/**
 * Recursive function to redact sensitive fields in an object
 */
const redactSensitiveData = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return;

  Object.keys(obj).forEach(key => {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redactSensitiveData(obj[key]);
    }
  });
};

// Using Lodash's cloneDeep for deep cloning objects

/**
 * Sanitizes request body to remove sensitive data
 */
const sanitizeRequestBody = (body: any) => {
  if (!body) return body;

  // Create a deep copy to avoid modifying the original using Lodash
  const sanitized = _.cloneDeep(body);
  redactSensitiveData(sanitized);
  return sanitized;
};

/**
 * Sanitizes and prepares response body for logging
 */
const prepareResponseBodyForLogging = (body: any) => {
  if (!body) return undefined;

  try {
    // Try to parse if it's a string that could be JSON
    const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;

    // If the body is too large, truncate it
    const bodyStr = JSON.stringify(parsedBody);
    if (bodyStr.length > 5000) {
      return {
        truncated: true,
        message: 'Response body too large to log completely',
        previewSize: 500,
        preview: bodyStr.substring(0, 500) + '...'
      };
    }

    // Create a deep copy to avoid modifying the original using Lodash
    const sanitized = _.cloneDeep(parsedBody);
    redactSensitiveData(sanitized);
    return sanitized;
  } catch (error) {
    // If we can't parse or process the body, return a simplified version
    if (typeof body === 'string' && body.length > 500) {
      return {
        type: 'string',
        truncated: true,
        preview: body.substring(0, 500) + '...'
      };
    }
    return { type: typeof body, preview: 'Unparseable response body' };
  }
};

/**
 * Middleware that adds logging to all API routes
 * 
 * @param handler - The API route handler
 * @returns A wrapped handler with logging
 */
export const withLogging = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
) => {
  return async (req: NextApiRequest, res: LoggingResponse) => {
    // Initialize response locals
    res.locals = {
      startTime: Date.now(),
      requestId: (req as any).requestId || generateRequestId()
    };

    // Set request ID if not already set
    if (!(req as any).requestId) {
      (req as any).requestId = res.locals.requestId;
    }

    const requestId = (req as any).requestId;
    const method = req.method || 'UNKNOWN';
    const url = req.url || 'UNKNOWN';

    // Log the request - using getLoggableRequest which deep clones and sanitizes data
    logger.info(requestId, `${method} ${url} - Request received`, {
      request: getLoggableRequest(req)
    });

    // Intercept common response methods
    // 1. Intercept json method
    const originalJson = res.json;
    res.json = function (body: any) {
      if (res.locals) {
        res.locals.responseBody = body;
      }
      return originalJson.call(this, body);
    };

    // 2. Intercept send method
    const originalSend = res.send;
    res.send = function (body: any) {
      if (res.locals) {
        res.locals.responseBody = body;
      }
      return originalSend.call(this, body);
    };

    // 3. Intercept status method to chain with response methods
    const originalStatus = res.status;
    res.status = function (statusCode: number) {
      const result = originalStatus.call(this, statusCode);
      const originalJson = result.json;
      const originalSend = result.send;

      // Override json method on the result
      result.json = function (body: any) {
        if (res.locals) {
          res.locals.responseBody = body;
        }
        return originalJson.call(this, body);
      };

      // Override send method on the result
      result.send = function (body: any) {
        if (res.locals) {
          res.locals.responseBody = body;
        }
        return originalSend.call(this, body);
      };

      return result;
    };

    // Capture the original end method to log the response
    const originalEnd = res.end;
    res.end = function (chunk: any, ...args: any[]) {
      const responseTime = Date.now() - res.locals!.startTime;
      const statusCode = res.statusCode;
      const responseBody = res.locals?.responseBody;

      let logLevel = LogLevel.INFO;
      if (statusCode >= 500) {
        logLevel = LogLevel.ERROR;
      } else if (statusCode >= 400) {
        logLevel = LogLevel.WARN;
      }

      // Parse and prepare the response body if any
      // Deep clone before processing to ensure we don't modify the original using Lodash
      const processedResponseBody = responseBody ? prepareResponseBodyForLogging(_.cloneDeep(responseBody)) : undefined;

      // Log response info with response body
      logger[logLevel === LogLevel.INFO ? 'info' : logLevel === LogLevel.WARN ? 'warn' : 'error'](
        requestId,
        `${method} ${url} - ${statusCode} - ${responseTime}ms - Response sent`,
        {
          statusCode,
          responseTime,
          ...(processedResponseBody ? { responseBody: processedResponseBody } : {})
        }
      );

      // Call the original end method
      return originalEnd.call(this, chunk, ...args);
    };

    // Call the original handler
    return handler(req, res);
  };
};
