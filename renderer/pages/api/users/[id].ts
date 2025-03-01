import { firebaseService } from '@/lib/services/firebaeService';
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const user = await firebaseService.fetchUserById(id as string)
        if (!user) {
          return res.status(404).json({ message: `User with id ${id} not found` })
        }

        res.status(200).json({ message: 'User fetched successfully', data: user })
      } catch (error) {
        console.error(`Error fetching user ${id}:`, error)
        res.status(500).json({ message: 'Failed to fetch user', error: error.message })
      }
      break;

    case 'POST':
      try {
        const newUser = await firebaseService.createUser(req.body)

        // Check if the user was a duplicate (using the _duplicate flag)
        const isDuplicate = newUser._duplicate;

        // Remove the internal _duplicate flag before sending the response
        const { _duplicate, ...userResponse } = newUser;

        // Set appropriate status code
        const statusCode = isDuplicate ? 200 : 201;

        res.status(statusCode).json({
          data: userResponse,
          isDuplicate,
          message: isDuplicate
            ? 'User with this email already exists'
            : 'User created successfully'
        })
      } catch (error) {
        console.error('Error creating user:', error)
        res.status(500).json({ message: 'Failed to create user', error: error.message })
      }
      break;

    case 'PUT':
      try {
        const updatedUser = await firebaseService.updateUser(id as string, req.body)
        res.status(200).json({ message: 'User updated successfully', data: updatedUser })
      } catch (error) {
        console.error(`Error updating user ${id}:`, error)
        res.status(500).json({ message: 'Failed to update user', error: error.message })
      }
      break;

    case 'DELETE':
      try {
        await firebaseService.deleteUser(id as string)
        // Return 204 No Content for successful deletion
        res.status(204).end()
      } catch (error) {
        console.error(`Error deleting user ${id}:`, error)
        res.status(500).json({ message: 'Failed to delete user', error: error.message })
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}