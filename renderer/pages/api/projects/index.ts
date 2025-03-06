import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseService } from '@/lib/services/firebaseService';
import { msSQLService } from '@/lib/services/msSQLService';
import { APIError } from '@/lib/errors/APIError';
import { withAPI } from '@/lib/middlewares/index';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const { userId } = req.query; // Optional query parameter to filter projects by user
    const requestId = (req as any).requestId || 'unknown';

    switch (method) {
        case 'GET':
            try {
                // Use the updated fetchProjects method that now accepts userId as a parameter
                const projects = await firebaseService.fetchProjects(userId as string);
                return res.status(200).json({ message: 'Projects fetched successfully', data: projects });
            } catch (error) {
                console.error('Error fetching projects:', error);
                throw new APIError(`Failed to fetch projects: ${error.message}`, 500);
            }

        case 'POST':
            try {
                // Ensure userId is provided in the request body
                if (!req.body.userId) {
                    throw new APIError('userId is required', 400);
                }

                await msSQLService.testConnection(req.body.sqlServerViewModels[0].sqlConfig, req.body.sqlServerViewModels[0].sqlConfig.table);

                const project = await firebaseService.addProject(req.body);
                return res.status(201).json({ message: 'Project created successfully', data: project });
            } catch (error) {
                console.error('Error creating project:', error);
                throw new APIError(`Failed to create project: ${error.message}`, error.status || 500);
            }

        default:
            // Instead of manually handling this, throw an APIError for method not allowed
            res.setHeader('Allow', ['GET', 'POST']);
            throw new APIError(`Method ${method} Not Allowed`, 405);
    }
}
// Export the handler wrapped with our combined API middleware (logging + error handling)
export default withAPI(handler);
