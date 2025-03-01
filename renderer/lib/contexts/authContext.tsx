import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { User } from '../models';
import CryptoJS from 'crypto-js';
import { authService } from '../services/authService';
import { GOOGLE_CLIENT_ID } from '../config/auth';

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (email: string, password: string, displayName?: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  socialLogin: (provider: 'google' | 'apple') => Promise<User | null>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps your app and makes auth object available to any child component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on initial render
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem('waterfall_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Error loading user from localStorage', error);
        // Clear corrupted data
        localStorage.removeItem('waterfall_user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function using apiService
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Input validation
      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Always encrypt the password before sending it to the server
      // This adds a layer of protection beyond HTTPS
      const publicSalt = 'waterfall-public-salt'; // In production, consider using env variables
      const encryptedPassword = CryptoJS.AES.encrypt(
        password,
        publicSalt
      ).toString();

      // Call the login API endpoint with encrypted password
      const user = await apiService.post('/auth/login', {
        email,
        password: encryptedPassword
      });

      // Validate the response
      if (!user || !user.id || !user.email) {
        throw new Error('Invalid response from server');
      }

      // Save user to local storage
      localStorage.setItem('waterfall_user', JSON.stringify(user));

      // Update state
      setUser(user);

      return user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('waterfall_user');
    setUser(null);
  };

  // Register function using apiService
  const register = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);

      // Input validation
      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Always encrypt the password before sending it to the server
      const publicSalt = 'waterfall-public-salt'; // In production, consider using env variables
      const encryptedPassword = CryptoJS.AES.encrypt(
        password,
        publicSalt
      ).toString();

      // Create the user payload
      const userPayload = {
        email,
        password: encryptedPassword,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString()
      };

      // Call the register API endpoint
      const user = await apiService.post('/auth/register', userPayload);

      // Validate the response
      if (!user || !user.id || !user.email) {
        throw new Error('Invalid response from server');
      }

      // Save user to local storage
      localStorage.setItem('waterfall_user', JSON.stringify(user));

      // Update state
      setUser(user);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Social login function
  const socialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);

      if (provider === 'google') {
        try {
          // Initialize Google authentication
          await authService.initGoogleAuth();

          // Prompt the user for Google Sign-In
          const response = await authService.promptGoogleSignIn(GOOGLE_CLIENT_ID);

          // Send the Google credential to our backend
          const user = await apiService.post('/auth/social-login', {
            provider,
            token: response.credential
          });

          // Validate the response
          if (!user || !user.id || !user.email) {
            throw new Error('Invalid response from server');
          }

          // Save user to local storage
          localStorage.setItem('waterfall_user', JSON.stringify(user));

          // Update state
          setUser(user);

          return user;
        } catch (error) {
          console.error('Google login error:', error);
          throw new Error(error.message || 'Google authentication failed');
        }
      } else if (provider === 'apple') {
        // Apple authentication will be implemented later
        const user = await apiService.post('/auth/social-login', { provider });

        // Validate the response
        if (!user || !user.id || !user.email) {
          throw new Error('Invalid response from server');
        }

        // Save user to local storage
        localStorage.setItem('waterfall_user', JSON.stringify(user));

        // Update state
        setUser(user);

        return user;
      } else {
        throw new Error('Unsupported provider');
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Provide the context
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      register,
      isAuthenticated: !!user,
      socialLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
