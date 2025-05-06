'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase'; // Adjust path as needed

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if auth is null before trying to use it. Log an error if it is.
    // This can happen if Firebase initialization failed in firebase.ts
    if (!auth) {
      console.error("useAuth: Firebase Auth instance is not available. Initialization likely failed. Check console logs from firebase.ts.");
      setLoading(false);
      setUser(null);
      return; // Stop if auth is not initialized
    }

    console.log("useAuth: Setting up onAuthStateChanged listener...");
    // Auth is available, set up the listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
       console.log("useAuth: onAuthStateChanged triggered. User:", currentUser ? currentUser.uid : null);
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
        // Handle potential errors during listener setup or execution
        console.error("useAuth: Error in onAuthStateChanged listener:", error);
        setUser(null);
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("useAuth: Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
