'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log("Environment Variables:", process.env);
  console.log("NEXT_PUBLIC_KEYS:", Object.keys(process.env).filter(key => key.startsWith("NEXT_PUBLIC_")));

  useEffect(() => {
    const checkAuthAndFirestore = async () => {
      if (!loading) {
        if (user) {
          // Assuming 'admin' is a special username or role, redirect accordingly
          if (user.displayName === 'admin') { // Replace with your actual admin check logic
            router.push('/admin/dashboard');
          } else {
            router.push('/performer/dashboard'); // Redirect logged-in performers
          }
        } else {
          router.push('/auth'); // Redirect to Auth page if not logged in
        }
      }

      // Check current user
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("Current User:", currentUser);
      });

      // Check Firestore connectivity
      try {
        const docRef = doc(db, "test", "test-doc"); // Replace with a real document if you have one
        const docSnap = await getDoc(docRef);
        console.log("Firestore Document:", docSnap.exists() ? docSnap.data() : "No such document!");
      } catch (error) {
        console.error("Firestore Error:", error);
      }
    }

    checkAuthAndFirestore();
  }, [user, loading, router]); 

  // Show a loading state while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }

  // This return is technically unreachable due to redirects, but good practice
  return null;
}
