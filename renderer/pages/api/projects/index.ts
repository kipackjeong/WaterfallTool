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
            let projects;

            // If userId is provided, filter projects by that user
            if (userId) {
                // Assuming firebaseService has a method to fetch projects by userId
                projects = await firebaseService.fetchProjects();
                // Filter the projects server-side if the service doesn't have a dedicated method
                projects = projects.filter(project => project.userId === userId);
            } else {
                // Fetch all projects if no userId filter is provided
                projects = await firebaseService.fetchProjects();
            }

            return res.status(200).json({ message: 'Projects fetched successfully', data: projects });

        case 'POST':

            await msSQLService.testConnection(req.body.sqlServerViewModels[0].sqlConfig, req.body.sqlServerViewModels[0].sqlConfig.table);

            const project = await firebaseService.addProject(req.body);
            return res.status(201).json({ message: 'Project created successfully', data: project });

        default:
            // Instead of manually handling this, throw an APIError for method not allowed
            res.setHeader('Allow', ['GET', 'POST']);
            throw new APIError(`Method ${method} Not Allowed`, 405);
    }
}
// Export the handler wrapped with our combined API middleware (logging + error handling)
export default withAPI(handler);
