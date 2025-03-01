import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method for logout
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed', allowedMethods: ['POST'] });
  }

  try {
    // In a real app with server-side sessions, you'd invalidate the session here
    // For this demo, we'll just return a success message since the client will
    // remove the user from localStorage
    
    // Optional: you could log the logout event in your database
    
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'An error occurred during logout', error: error.message });
  }
}
