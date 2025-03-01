import { initializeApp } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, DocumentSnapshot } from 'firebase/firestore';
import { ProjectViewModel, User } from '../models';

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
  async fetchProjects() {
    console.log('[firebaseService] fetchProjects')
    const querySnapshot = await getDocs(collection(db, 'projects'));
    const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return projects;
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

        // Update the existing project
        const projectDoc = doc(db, 'projects', projectId);
        await updateDoc(projectDoc, projectData);

        console.log(`Project '${projectData.name}' already exists. Updated existing project.`);
        return { id: projectId, ...projectData };
      }

      projectData = {
        id: uuidv4(),
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
      throw error;
    }
  },

  async updateProject(id, updateData) {
    console.log('[firebaseService] updateProject', id, updateData)
    const projectDoc = doc(db, 'projects', id);
    await updateDoc(projectDoc, updateData);
    return { id, ...updateData };
  },

  async deleteProject(id) {
    console.log('[firebaseService] deleteProject', id)
    const projectDoc = doc(db, 'projects', id);
    await deleteDoc(projectDoc);
    return { id };
  },

  async fetchProjectById(id: string, userId: string | null = null) {
    console.log('[firebaseService] fetchProjectById', id, userId)
    try {
      const projectDoc = await getDoc(doc(db, 'projects', id)) as DocumentSnapshot<ProjectViewModel>;

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
