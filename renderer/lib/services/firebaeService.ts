import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { User } from '../models';

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
    const querySnapshot = await getDocs(collection(db, 'projects'));
    console.log('querySnapshot:', querySnapshot)
    const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return projects;
  },

  async addProject(projectData) {
    const docRef = await addDoc(collection(db, 'projects'), projectData);
    return { id: docRef.id, ...projectData };
  },

  async updateProject(id, updateData) {
    const projectDoc = doc(db, 'projects', id);
    await updateDoc(projectDoc, updateData);
    return { id, ...updateData };
  },

  async deleteProject(id) {
    const projectDoc = doc(db, 'projects', id);
    await deleteDoc(projectDoc);
    return { id };
  },
  //// USERS ////
  async fetchUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log('querySnapshot:', querySnapshot)
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    return users;
  },
  async fetchUserById(id: string): Promise<User | null> {
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
  async addUser(user) {
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
      
      const docRef = await addDoc(collection(db, 'users'), user);
      console.log(`User with email ${user.email} added successfully with ID: ${docRef.id}`);
      return { id: docRef.id, ...user } as User;
    } catch (error) {
      console.error('Error in addUser:', error);
      throw error;
    }
  },
  async updateUser(id: string, updateData: Record<string, any>): Promise<User> {
    const userDoc = doc(db, 'users', id);
    await updateDoc(userDoc, updateData);
    return { id, ...updateData } as User;
  },
  async deleteUser(id: string): Promise<{ id: string }> {
    const userDoc = doc(db, 'users', id);
    await deleteDoc(userDoc);
    return { id };
  }
};
