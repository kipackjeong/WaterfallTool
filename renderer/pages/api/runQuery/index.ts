import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseService } from '@/lib/services/firebaseService';
import { msSQLService, SqlConfig } from '@/lib/services/msSQLService';
import { APIError } from '@/lib/errors/APIError';
import { withAPI } from '@/lib/middlewares/index';
import projects from '../projects';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const { userId } = req.query; // Optional query parameter to filter projects by user
    const requestId = (req as any).requestId || 'unknown';

    switch (method) {
        case 'GET':

            // If userId is provided, filter projects by that user
            if (userId) {
            } else {
                // Fetch all projects if no userId filter is provided
            }

            return res.status(200).json({ message: 'Projects fetched successfully', data: projects });

        case 'POST':
            /**
             * {
             *  user: string
             *  password: string
             *  isRemote: boolean
             *  server: string
             *  database: string
             *  table: string
             *  query: string
             * }
             */
            const { body } = req;
            // sqlConfig
            const sqlConfig: SqlConfig = {
                server: body.server,
                database: body.database,
                user: body.user || '',
                password: body.password || '',
                isRemote: body.isRemote
            };
            const { query } = body;

            const results = await msSQLService.executeQuery(sqlConfig, query);

            return res.status(200).json({ message: 'Query executed successfully', data: results });
            break;

        default:
            // Instead of manually handling this, throw an APIError for method not allowed
            res.setHeader('Allow', ['GET', 'POST']);
            throw new APIError(`Method ${method} Not Allowed`, 405);
    }
}
// Export the handler wrapped with our combined API middleware (logging + error handling)
export default withAPI(handler);