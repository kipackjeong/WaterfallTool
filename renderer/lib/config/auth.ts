/**
 * Authentication Configuration
 * 
 * This file contains configuration settings for authentication providers.
 * In a real-world application, these values should be stored in environment variables.
 */

// Google OAuth Client ID
// For development, you can replace this with your own Google OAuth client ID
// In production, use process.env.GOOGLE_CLIENT_ID
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

// Apple OAuth Client ID
// For development, you can replace this with your own Apple OAuth client ID
// In production, use process.env.APPLE_CLIENT_ID
export const APPLE_CLIENT_ID = 'YOUR_APPLE_CLIENT_ID';

// Authentication settings
export const AUTH_CONFIG = {
  // Token expiration time in seconds (24 hours)
  tokenExpiration: 24 * 60 * 60,
  
  // Minimum password length
  minPasswordLength: 8,
  
  // Whether to require email verification
  requireEmailVerification: false,
  
  // Password encryption salt (in production, use environment variable)
  encryptionSalt: 'waterfall-public-salt',
  
  // Supported authentication providers
  providers: {
    email: true,
    google: true,
    apple: false // Not yet implemented
  }
};
