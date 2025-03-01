import type { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '@/lib/services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method for registration
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed', allowedMethods: ['POST'] });
  }

  try {
    const { email, password, displayName, createdAt } = req.body;

    // Basic request validation - controller's responsibility
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      // Call service method to handle business logic
      const user = await authService.register({
        email,
        encryptedPassword: password,
        displayName,
        createdAt
      });

      // Return successful response
      return res.status(201).json({ message: 'Registration successful', data: user });
    } catch (error) {
      // Handle service-level errors with appropriate status codes
      console.error('Registration error:', error);

      if (error.message === 'Invalid email format' || error.message === 'Invalid password format') {
        return res.status(400).json({ message: error.message });
      } else if (error.message === 'User with this email already exists') {
        return res.status(409).json({ message: error.message });
      } else {
        return res.status(500).json({ message: 'Registration failed' });
      }
    }
  } catch (error) {
    console.error('Server error during registration:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}
