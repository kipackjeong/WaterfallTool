import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseService } from '@/lib/services/firebaeService';
import { User } from '@/lib/models';
import { generateToken } from '@/lib/services/tokenService';

// A simple function to decode the JWT token
// In a real implementation, you would use a proper library to verify the token
const decodeJwtToken = (token: string) => {
  try {
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString();
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    throw new Error('Invalid token');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method for social login
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed', allowedMethods: ['POST'] });
  }

  try {
    const { provider, token } = req.body;

    // Validate request body
    if (!provider) {
      return res.status(400).json({ message: 'Provider is required' });
    }

    // Validate provider
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid provider. Supported providers: google, apple' });
    }

    try {
      let userData: Partial<User>;

      if (provider === 'google') {
        // Google authentication
        if (!token) {
          return res.status(400).json({ message: 'Google token is required' });
        }

        try {
          // Decode the Google JWT token
          // In production, you should verify the token with Google's public keys
          const decodedToken = decodeJwtToken(token);

          // Extract user information from the token
          userData = {
            email: decodedToken.email,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture,
            provider: 'google',
            createdAt: new Date().toISOString()
          };

          if (!userData.email) {
            throw new Error('Unable to extract email from Google token');
          }

          // Check if user already exists
          let user = await firebaseService.getUserByEmail(userData.email);

          if (!user) {
            // Create a new user
            user = await firebaseService.addUser(userData);
          } else {
            // Update existing user with latest Google info
            user = await firebaseService.updateUser(user.id, userData);
          }

          // Generate app token
          const newtoken = await generateToken(user);

          // Return user data with token
          return res.status(200).json({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: user.provider,
            token: newtoken
          });
        } catch (error) {
          console.error('Error processing Google token:', error);
          return res.status(401).json({ message: 'Invalid Google token', error: error.message });
        }
      } else if (provider === 'apple') {
        // Apple authentication - to be implemented
        // For now, return mock data
        userData = {
          id: `apple-${Date.now()}`,
          email: `user-${Date.now()}@apple.example`,
          displayName: `Apple User`,
          photoURL: `https://via.placeholder.com/150?text=apple`,
          provider: 'apple',
          createdAt: new Date().toISOString()
        };

        return res.status(200).json(userData);
      }
    } catch (error) {
      console.error('Social authentication error:', error);
      return res.status(401).json({ message: 'Social authentication failed', error: error.message });
    }
  } catch (error) {
    console.error('Server error during social login:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
