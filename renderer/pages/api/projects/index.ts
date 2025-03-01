import type { NextApiRequest, NextApiResponse } from 'next';
import { firebaseService } from '@/lib/services/firebaeService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const { userId } = req.query; // Optional query parameter to filter projects by user
    console.log(`[API] ${new Date().toISOString()} - /api/projects - ${method} request received`);

    switch (method) {
        case 'GET':
            try {
                console.log(`[API] Projects GET request with params:`, { userId });
                let projects;

                // If userId is provided, filter projects by that user
                if (userId) {
                    console.log(`[API] Fetching projects for userId: ${userId}`);
                    // Assuming firebaseService has a method to fetch projects by userId
                    projects = await firebaseService.fetchProjects();
                    // Filter the projects server-side if the service doesn't have a dedicated method
                    projects = projects.filter(project => project.userId === userId);
                    console.log(`[API] Found ${projects.length} projects for user ${userId}`);
                } else {
                    console.log(`[API] Fetching all projects (no userId filter)`);
                    // Fetch all projects if no userId filter is provided
                    projects = await firebaseService.fetchProjects();
                    console.log(`[API] Retrieved ${projects.length} total projects`);
                }

                console.log(`[API] Successfully processed GET request for projects`);
                return res.status(200).json({ message: 'Projects fetched successfully', data: projects });
            } catch (error) {
                console.error('[API] Error fetching projects:', error);
                return res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
            }

        case 'POST':
            try {
                console.log(`[API] Projects POST request with body:`, JSON.stringify(req.body).substring(0, 200) + '...');

                // Create a new project
                const project = await firebaseService.addProject(req.body);
                console.log(`[API] Project created/updated successfully with id: ${project.id}`);

                return res.status(201).json({ message: 'Project created successfully', data: project });
            } catch (error) {
                console.error('[API] Error creating project:', error);
                return res.status(500).json({ message: 'Failed to create project', error: error.message });
            }

        default:
            console.log(`[API] Unsupported method ${method} requested`);
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
}
