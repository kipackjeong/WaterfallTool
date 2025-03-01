import type { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '@/lib/services/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method for login
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed', allowedMethods: ['POST'] });
  }

  try {
    const { email, password } = req.body;

    // Basic request validation - controller's responsibility
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      // Call service method to handle business logic
      const user = await authService.login(email, password);
      
      // Return successful response
      return res.status(200).json(user);
    } catch (error) {
      // Handle service-level errors with appropriate status codes
      console.error('Authentication error:', error);
      
      if (error.message === 'Invalid email format' || error.message === 'Invalid password format') {
        return res.status(400).json({ message: error.message });
      } else if (error.message === 'Authentication failed') {
        return res.status(401).json({ message: 'Authentication failed' });
      } else {
        return res.status(500).json({ message: 'Authentication failed' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}
