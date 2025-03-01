import { firebaseService } from '@/lib/services/firebaeService';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { userId } = req.query; // Extract userId from query parameters
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        // Fetch a specific project by ID, optionally filtering by userId
        const project = await firebaseService.fetchProjectById(id as string, userId as string);
        if (!project) {
          return res.status(404).json({ message: `Project with id ${id} not found or not accessible` });
        }

        return res.status(200).json({ message: 'Project fetched successfully', data: project });
      } catch (error) {
        console.error(`Error fetching project ${id}:`, error);
        return res.status(500).json({ message: 'Failed to fetch project', error: error.message });
      }

    case 'PUT':
      try {
        // Update an existing project
        const updatedProject = await firebaseService.updateProject(id as string, req.body);
        return res.status(200).json({ message: 'Project updated successfully', data: updatedProject });
      } catch (error) {
        console.error(`Error updating project ${id}:`, error);
        return res.status(500).json({ message: 'Failed to update project', error: error.message });
      }

    case 'DELETE':
      try {
        // Delete a project
        await firebaseService.deleteProject(id as string);
        return res.status(200).json({ message: 'Project deleted successfully', data: { id } });
      } catch (error) {
        console.error(`Error deleting project ${id}:`, error);
        return res.status(500).json({ message: 'Failed to delete project', error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}
