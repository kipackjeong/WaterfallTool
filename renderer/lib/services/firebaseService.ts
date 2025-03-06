import { initializeApp } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, DocumentSnapshot } from 'firebase/firestore';
import { ProjectDataModel, User } from '../models';
import { ApiError } from 'next/dist/server/api-utils';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZhx_R7zOJm1g3w7asJUNMppn9h4aZf3U",
  authDomain: "water-800cd.firebaseapp.com",
  projectId: "water-800cd",
  storageBucket: "water-800cd.firebasestorage.app",
  messagingSenderId: "177602872359",
  appId: "1:177602872359:web:941a330b5999640eed7a02",
  measurementId: "G-EMZ3FQNH3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const firebaseService = {
  //// Projects ////
  async fetchProjects(userId: string | null = null) {
    try {
      let projectsQuery;

      // If userId is provided, only fetch projects for that user
      if (userId) {
        projectsQuery = query(collection(db, 'projects'), where('userId', '==', userId));
      } else {
        projectsQuery = collection(db, 'projects');
      }

      const querySnapshot = await getDocs(projectsQuery);
      const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return projects;
    } catch (err) {
      console.error('Error fetching projects:', err);
      throw err;
    }
  },

  async addProject(projectData) {
    console.log('[firebaseService] addProject:', projectData)
    // Validate required fields
    if (!projectData.name || !projectData.userId) {
      throw new Error('Project must have a name and userId');
    }

    try {
      // Check if a project with the same name already exists for this user
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef,
        where('name', '==', projectData.name),
        where('userId', '==', projectData.userId)
      );
      const querySnapshot = await getDocs(q);

      // If project already exists, update it
      if (!querySnapshot.empty) {
        const existingProject = querySnapshot.docs[0];
        const projectId = existingProject.id;
        const existingData = existingProject.data() as ProjectDataModel;

        // Deep merge the existing project with the new project data
        const mergedProjectData = deepMergeProjects(existingData, projectData);
        console.log('Merged project data:', JSON.stringify(mergedProjectData, null, 2));
        console.log('Existing project data:', JSON.stringify(existingData, null, 2));
        console.log('New project data:', JSON.stringify(projectData, null, 2));

        // Update the existing project with merged data
        const projectDoc = doc(db, 'projects', projectId);
        await updateDoc(projectDoc, mergedProjectData);

        console.log(`Project '${mergedProjectData.name}' already exists. Updated existing project with merged data.`);
        return { id: projectId, ...mergedProjectData };
      }

      projectData = {
        ...projectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Create a new project if it doesn't exist
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      console.log(`Created new project '${projectData.name}' with ID: ${docRef.id}`);
      return { id: docRef.id, ...projectData };
    } catch (error) {
      console.error('Error adding/updating project:', error);
      throw new ApiError(500, `Failed to add project: ${error.message}`);
    }
  },

  async updateProject(id, updateData, userId: string | null = null) {
    console.log('[firebaseService] updateProject', id, updateData)

    // If userId is provided, verify the project belongs to the user before updating
    if (userId) {
      const project = await this.fetchProjectById(id);
      if (!project || project.userId !== userId) {
        throw new Error('Unauthorized: Project does not belong to the specified user');
      }
    }

    const projectDoc = doc(db, 'projects', id);
    await updateDoc(projectDoc, updateData);
    return { id, ...updateData };
  },

  async deleteProject(id, userId: string | null = null) {
    console.log('[firebaseService] deleteProject', id)

    // If userId is provided, verify the project belongs to the user before deleting
    if (userId) {
      const project = await this.fetchProjectById(id);
      if (!project || project.userId !== userId) {
        throw new Error('Unauthorized: Project does not belong to the specified user');
      }
    }

    const projectDoc = doc(db, 'projects', id);
    await deleteDoc(projectDoc);
    return { id };
  },

  async fetchProjectById(id: string, userId: string | null = null) {
    console.log('[firebaseService] fetchProjectById', id, userId)
    try {
      const projectDoc = await getDoc(doc(db, 'projects', id)) as DocumentSnapshot<ProjectDataModel>;

      if (!projectDoc.exists()) {
        return null;
      }

      const project = { id: projectDoc.id, ...projectDoc.data() };

      // If userId is provided, only return the project if it belongs to that user
      if (userId && project.userId !== userId) {
        return null; // Project doesn't belong to requested user
      }

      return project;
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  },

  //// USERS ////
  async fetchUsers(): Promise<User[]> {
    console.log('[firebaseService] fetchUsers')

    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    return users;
  },
  async fetchUserById(id: string): Promise<User | null> {
    console.log('[firebaseService] fetchUserById', id)
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    console.log('docSnap:', docSnap.data())
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      return null;
    }
  },
  async getUserByEmail(email: string): Promise<User | null> {
    console.log('[firebaseService] getUserByEmail', email)
    try {
      // Create a query against the collection for the specific email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Return the first user that matches the email
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  },
  async createUser(user) {
    console.log('[firebaseService] createUser', user)
    // Basic validation
    if (!user || !user.email) {
      throw new Error('User object must include an email address');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new Error('Invalid email format');
    }

    try {
      // Check if user with same email already exists
      const existingUser = await this.getUserByEmail(user.email);

      if (existingUser) {
        console.log(`User with email ${user.email} already exists. Returning existing user.`);
        return {
          ...existingUser,
          _duplicate: true // Flag to indicate this was a duplicate
        } as User;
      }

      // If no duplicate, proceed with adding the new user
      // Set createdAt if not provided
      if (!user.createdAt) {
        user.createdAt = new Date().toISOString();
      }

      // Add the new user
      const docRef = await addDoc(collection(db, 'users'), {
        ...user,
        createdAt: user.createdAt
      });

      console.log(`User with email ${user.email} added successfully with ID: ${docRef.id}`);
      return { id: docRef.id, ...user } as User;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  },

  async updateUser(id: string, updateData: Record<string, any>): Promise<User> {
    console.log('[firebaseService] updateUser', id, updateData)
    const userDoc = doc(db, 'users', id);
    await updateDoc(userDoc, updateData);
    return { id, ...updateData } as User;
  },
  async deleteUser(id: string): Promise<{ id: string }> {
    console.log('[firebaseService] deleteUser', id)
    const userDoc = doc(db, 'users', id);
    await deleteDoc(userDoc);
    return { id };
  }
};


/**
 * Deep merges two projects, maintaining the hierarchy structure at all levels
 * This is particularly useful for preserving data that might be missing in updates
 */
const deepMergeProjects = (existingProject: ProjectDataModel, newProject: ProjectDataModel): ProjectDataModel => {
  if (!existingProject || !newProject) return newProject || existingProject;

  // Create a base merged project with primitive properties
  const merged: ProjectDataModel = { ...existingProject, ...newProject };

  // Ensure userId consistency - prioritize existing userId if available
  merged.userId = existingProject.userId || newProject.userId;

  // If the new project has SQL server models, we need to merge them with existing ones
  if (newProject.sqlServers && existingProject.sqlServers) {
    // Create a map of existing servers by name for easy lookup
    const existingServersMap = existingProject.sqlServers.reduce((map, server) => {
      map[server.name] = server;
      return map;
    }, {});

    // Create merged SQL server models array
    merged.sqlServers = newProject.sqlServers.map(newServer => {
      const existingServer = existingServersMap[newServer.name];

      // If this server doesn't exist in the existing project, use the new server as is
      if (!existingServer) return newServer;

      // Merge the server properties
      const mergedServer = { ...existingServer, ...newServer };

      // If the new server has databases, we need to merge them with existing ones
      if (newServer.databases && existingServer.databases) {
        // Create a map of existing databases by name for easy lookup
        const existingDbMap = existingServer.databases.reduce((map, db) => {
          map[db.name] = db;
          return map;
        }, {});

        // Create merged databases array
        mergedServer.databases = newServer.databases.map(newDb => {
          const existingDb = existingDbMap[newDb.name];

          // If this database doesn't exist in the existing server, use the new database as is
          if (!existingDb) return newDb;

          // Merge the database properties
          const mergedDb = { ...existingDb, ...newDb };

          // If the new database has tables, we need to merge them with existing ones
          if (newDb.tables && existingDb.tables) {
            // Create a map of existing tables by name for easy lookup
            const existingTableMap = existingDb.tables.reduce((map, table) => {
              map[table.name] = table;
              return map;
            }, {});

            // Create merged tables array starting with tables from the new project
            const mergedTables = newDb.tables.map(newTable => {
              const existingTable = existingTableMap[newTable.name];

              // If this table doesn't exist in the existing database, use the new table as is
              if (!existingTable) return newTable;

              // Merge the table properties
              return { ...existingTable, ...newTable };
            });

            // Also include any tables from the existing database that aren't in the new database
            const newTableNames = new Set(newDb.tables.map(t => t.name));
            const missingTables = existingDb.tables.filter(table => !newTableNames.has(table.name));

            // Set the merged tables array including both new and existing tables
            mergedDb.tables = [...mergedTables, ...missingTables];
          }

          return mergedDb;
        });
      }

      return mergedServer;
    });

    // Also include any servers from the existing project that aren't in the new project
    const newServerNames = new Set(newProject.sqlServers.map(s => s.name));
    const missingServers = existingProject.sqlServers.filter(server => !newServerNames.has(server.name));
    merged.sqlServers = [...merged.sqlServers, ...missingServers];
  }

  // Update the timestamps
  merged.updatedAt = new Date().toISOString();

  return merged;
};