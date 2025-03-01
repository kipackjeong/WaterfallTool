import { User } from '../models';
import CryptoJS from 'crypto-js';

/**
 * Generate a token for the user
 * In production you would use a proper JWT library like jsonwebtoken
 * 
 * @param user The user to generate a token for
 * @returns A token string
 */
export const generateToken = async (user: User): Promise<string> => {
  try {
    // In production, use a proper JWT library and store secret in environment variables
    const secret = 'waterfall-token-secret';
    
    // Create a payload with user information and expiration
    const payload = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      // Set expiration to 24 hours from now
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };
    
    // Convert payload to string
    const payloadString = JSON.stringify(payload);
    
    // Encrypt payload with secret
    // In production, use a proper JWT library like jsonwebtoken
    const token = CryptoJS.AES.encrypt(payloadString, secret).toString();
    
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    // Return a simulated token in case of error
    return 'jwt_' + Math.random().toString(36).substring(2);
  }
};

/**
 * Verify a token and return the user data
 * In production you would use a proper JWT library like jsonwebtoken
 * 
 * @param token The token to verify
 * @returns The user data from the token, or null if invalid
 */
export const verifyToken = async (token: string): Promise<any | null> => {
  try {
    // In production, use a proper JWT library and store secret in environment variables
    const secret = 'waterfall-token-secret';
    
    // Decrypt token
    const bytes = CryptoJS.AES.decrypt(token, secret);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    // Parse payload
    const payload = JSON.parse(decryptedData);
    
    // Check if token is expired
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};
