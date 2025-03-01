import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseService } from '../../lib/services/firebaeService';

// Mock database for demonstration purposes
let projects = [
  { id: 1, name: 'Project 1' },
  { id: 2, name: 'Project 2' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Return all projects
      try {
        const projects = await firebaseService.fetchProjects();
        res.status(200).json({ data: 'hello world' });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
      break;
    case 'POST':
      // Create a new project
      const newProject = { id: Date.now(), ...req.body };
      projects.push(newProject);
      res.status(201).json(newProject);
      break;
    case 'PUT':
      // Update an existing project
      const { id, ...updateData } = req.body;
      projects = projects.map(project =>
        project.id === id ? { ...project, ...updateData } : project
      );
      res.status(200).json({ message: 'Project updated' });
      break;
    case 'DELETE':
      // Delete a project
      const { id: deleteId } = req.body;
      projects = projects.filter(project => project.id !== deleteId);
      res.status(200).json({ message: 'Project deleted' });
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}