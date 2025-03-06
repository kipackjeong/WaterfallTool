import { User } from '../models';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

/**
 * Gets the current user from localStorage
 * 
 * @returns The user object or null if not found
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('waterfall_user');
    if (!userStr) {
      return null;
    }
    return JSON.parse(userStr);
  } catch (err) {
    console.error('Error getting current user from localStorage:', err);
    return null;
  }
};

/**
 * Gets a Firebase ID token for authenticated API requests
 * 
 * This function:
 * 1. Gets the custom token from user object or localStorage
 * 2. Uses the custom token to authenticate with Firebase
 * 3. Returns the ID token for use with authenticated API requests
 * 
 * @param user The user object which may contain a customToken
 * @returns A promise that resolves to the Firebase ID token
 */
export const getFirebaseIdToken = async (user: User): Promise<string> => {
  try {
    // Get the custom token from the user object directly if available
    let customToken = user?.customToken;
    
    // If customToken is not in the user object, try to get it from localStorage as backup
    if (!customToken) {
      const userFromStorage = getCurrentUser();
      customToken = userFromStorage?.customToken || '';
    }
    
    // If we still don't have a valid token, throw an error
    if (!customToken) {
      throw new Error('No authentication token available');
    }

    // Sign in to Firebase with the custom token
    const auth = getAuth();
    const userCred = await signInWithCustomToken(auth, customToken);
    
    // Get the ID token for API authentication
    const idToken = await userCred.user.getIdToken();
    return idToken;
  } catch (err) {
    console.error('Error getting Firebase ID token:', err);
    throw err;
  }
};

/**
 * Utility function that adds the Firebase ID token to request headers
 * 
 * @param user The user object
 * @returns A promise that resolves to an object with headers containing the Authorization token
 */
export const getAuthHeaders = async (user: User): Promise<{ headers: { Authorization: string } }> => {
  const idToken = await getFirebaseIdToken(user);
  return {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  };
};
