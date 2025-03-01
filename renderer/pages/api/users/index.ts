import { firebaseService } from '@/lib/services/firebaeService';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                // Fetch all users
                const users = await firebaseService.fetchUsers();
                res.status(200).json(users);
            } catch (error) {
                console.error('Error fetching users:', error);
                res.status(500).json({ message: 'Failed to fetch users', error: error.message });
            }
            break;

        case 'POST':
            try {
                // Create a new user
                const newUser = await firebaseService.createUser(req.body);

                // Remove the internal _duplicate flag before sending the response
                const { _duplicate, ...userResponse } = newUser;

                // Set appropriate status code
                const statusCode = _duplicate ? 200 : 201;

                res.status(statusCode).json({
                    ...userResponse,
                    isDuplicate: _duplicate,
                    message: _duplicate
                        ? 'User with this email already exists'
                        : 'User created successfully'
                });
            } catch (error) {
                console.error('Error creating user:', error);
                res.status(500).json({ message: 'Failed to create user', error: error.message });
            }
            break;

        case 'PUT':
            try {
                // This is a bulk update endpoint for multiple users
                // The individual user update should use the [id].ts endpoint
                if (!Array.isArray(req.body)) {
                    return res.status(400).json({ message: 'PUT to /users expects an array of user updates' });
                }

                const updatedUsers = await Promise.all(
                    req.body.map(async ({ id, ...data }) => {
                        if (!id) {
                            throw new Error('Each user update must include an id');
                        }
                        return await firebaseService.updateUser(id, data);
                    })
                );

                res.status(200).json(updatedUsers);
            } catch (error) {
                console.error('Error updating users:', error);
                res.status(500).json({ message: 'Failed to update users', error: error.message });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}