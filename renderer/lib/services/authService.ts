import { User } from '../models';
import { firebaseService } from './firebaeService';
import CryptoJS from 'crypto-js';
import { generateToken } from './tokenService';

// Define the Google credential response interface
interface GoogleCredentialResponse {
  clientId: string;
  credential: string;
  select_by: string;
}

/**
 * Authentication service responsible for handling all business logic
 * related to user authentication, registration, and password management.
 */
export const authService = {
  /**
   * Login a user with email and encrypted password
   * @param email User's email
   * @param encryptedPassword Password encrypted on client side
   * @returns Authenticated user with token
   */
  async login(email: string, encryptedPassword: string): Promise<any> {
    // Validate inputs
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!encryptedPassword) {
      throw new Error('Password is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Decrypt the password
    const decryptedPassword = this.decryptPassword(encryptedPassword);

    // Find user in database
    const existingUser = await firebaseService.getUserByEmail(email);

    // The user with given email doesn't exist
    if (!existingUser) {
      throw new Error('Authentication failed');
    }

    // Verify password
    const storedPasswordHash = existingUser.passwordHash;

    if (!storedPasswordHash) {
      console.log('passwordHash is not set!!')
      console.log('password mismatch!!')

      throw new Error('Authentication failed');
    }

    // In production, use bcrypt or argon2 instead of this simple hash
    const expectedHash = 'hashed_' + decryptedPassword;

    if (storedPasswordHash !== expectedHash) {
      console.log('passwordHash:', storedPasswordHash)
      console.log('expectedHash:', expectedHash)
      console.log('password mismatch!!')
      throw new Error('Authentication failed');
    }

    // Generate token
    const token = await generateToken(existingUser);

    // Return sanitized user data
    return {
      id: existingUser.id,
      email: existingUser.email,
      displayName: existingUser.displayName,
      photoURL: existingUser.photoURL,
      token
    };
  },

  /**
   * Register a new user with email and encrypted password
   * @param userData User data including encrypted password
   * @returns Created user with token
   */
  async register(userData: {
    email: string;
    encryptedPassword: string;
    displayName?: string;
    createdAt?: string;
  }): Promise<any> {
    const { email, encryptedPassword, displayName, createdAt } = userData;

    // Validate inputs
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    if (!encryptedPassword) {
      throw new Error('Password is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Decrypt the password
    const decryptedPassword = this.decryptPassword(encryptedPassword);

    // Check if user already exists
    const existingUser = await firebaseService.getUserByEmail(email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password for storage
    // In production, use bcrypt or argon2 instead of this simple hash
    const passwordHash = 'hashed_' + decryptedPassword;

    // Create the user
    const newUser = await firebaseService.createUser({
      email,
      displayName: displayName || email.split('@')[0],
      passwordHash,
      createdAt: createdAt || new Date().toISOString()
    });

    // Generate token
    const token = await generateToken(newUser);

    // Return sanitized user data
    return {
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.displayName,
      photoURL: newUser.photoURL,
      token
    };
  },

  /**
   * Decrypt a password that was encrypted on the client side
   * @param encryptedPassword Password encrypted on client side
   * @returns Decrypted password
   */
  decryptPassword(encryptedPassword: string): string {
    try {
      // Use the same salt as on client side
      const publicSalt = 'waterfall-public-salt'; // In production, use env variables
      const bytes = CryptoJS.AES.decrypt(encryptedPassword, publicSalt);
      const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

      // Validate decrypted password
      if (!decryptedPassword || decryptedPassword.length < 6) {
        throw new Error('Invalid password format');
      }

      return decryptedPassword;
    } catch (error) {
      throw new Error('Invalid password format');
    }
  },

  /**
   * Initialize Google Sign-In
   * This function dynamically loads the Google Identity Services script
   * and configures the authentication client.
   */
  initGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if the script is already loaded
        if (document.querySelector('script#google-identity-services')) {
          resolve();
          return;
        }

        // Create script element
        const script = document.createElement('script');
        script.id = 'google-identity-services';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        // Handle script load events
        script.onload = () => resolve();
        script.onerror = (error) => reject(new Error('Failed to load Google Identity Services: ' + error));

        // Append the script to the document
        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Render a Google Sign-In button
   * @param containerId The ID of the container element where the button will be rendered
   * @param clientId Your Google Client ID
   * @param onSuccess Callback function when authentication succeeds
   * @param onError Callback function when authentication fails
   */
  renderGoogleButton(
    containerId: string,
    clientId: string,
    onSuccess: (response: any) => void,
    onError: (error: Error) => void
  ): void {
    try {
      // Check if google object is available
      if (!window.google) {
        onError(new Error('Google Identity Services not loaded'));
        return;
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          if (response.credential) {
            onSuccess(response);
          } else {
            onError(new Error('Google authentication failed'));
          }
        },
        cancel_on_tap_outside: false
      });

      // Render the button
      window.google.accounts.id.renderButton(
        document.getElementById(containerId) as HTMLElement,
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left'
        }
      );
    } catch (error) {
      onError(error);
    }
  },

  /**
   * Prompt the user for Google Sign-In
   * @param clientId Your Google Client ID
   * @returns Promise that resolves with the credential response
   */
  promptGoogleSignIn(clientId: string): Promise<GoogleCredentialResponse> {
    return new Promise((resolve, reject) => {
      try {
        // Check if google object is available
        if (!window.google) {
          reject(new Error('Google Identity Services not loaded'));
          return;
        }

        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: GoogleCredentialResponse) => {
            if (response.credential) {
              resolve(response);
            } else {
              reject(new Error('Google authentication failed'));
            }
          },
          cancel_on_tap_outside: false
        });

        // Prompt one-tap sign-in
        window.google.accounts.id.prompt();
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Authenticate with Google using the ID token
   * @param googleIdToken The ID token from Google Sign-In
   * @returns Authenticated user with token
   */
  async googleLogin(googleIdToken: string): Promise<any> {
    try {
      // In a real application, you would send this token to your backend
      // to verify it with Google's servers and get the user profile

      // Call API endpoint for social login
      const userData = await fetch('/api/auth/social-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'google',
          token: googleIdToken
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error('Google authentication failed');
        }
        return res.json();
      });

      return userData;
    } catch (error) {
      console.error('Google authentication error:', error);
      throw error;
    }
  }
};

// Add TypeScript declaration for the global google object
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (container: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

/**
 * Handle social login authentication with third-party providers
 * @param provider The social identity provider (google or apple)
 * @param token The authentication token from the provider
 * @returns Authenticated user with app token
 */
export const handleSocialLogin = async (provider: 'google' | 'apple', token: string): Promise<any> => {
  try {
    // Input validation
    if (!provider) {
      throw new Error('Provider is required');
    }

    if (!token) {
      throw new Error('Authentication token is required');
    }

    // In a real implementation, here we would:
    // 1. Verify the token with the provider (Google or Apple)
    // 2. Extract user information from the verified token
    // 3. Create or update the user in our database
    // 4. Generate our application token

    // For now, we'll simulate this by calling our social-login API endpoint
    // which already handles the mock implementation

    // Return sanitized user data with token
    return {
      provider,
      token,
      authenticated: true
      // The actual implementation would return real user data
    };
  } catch (error) {
    console.error(`${provider} authentication error:`, error);
    throw error;
  }
};
