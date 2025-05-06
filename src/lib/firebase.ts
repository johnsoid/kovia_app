
console.log(`[${new Date().toISOString()}] Firebase Initialization Starting...`);

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, Functions, connectFunctionsEmulator } from "firebase/functions";


// This file does not include connectFirestoreEmulator.

// Define the interface for the Firebase config
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Use environment variables directly.
// Ensure these are correctly set in your .env.local file
// and prefixed with NEXT_PUBLIC_ if used client-side.
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Log the config being used (ensure API keys are not logged in production environments)
if (process.env.NODE_ENV === 'development' || true) {
  console.log("Firebase Config:", firebaseConfig);
}

// Validate the configuration
const requiredKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

console.log("Environment Variables:", {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;


if (missingKeys.length > 0) { 
    console.error(`Firebase initialization failed: Missing configuration keys: ${missingKeys.join(', ')}. Check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`);
} else {
    try {
        console.log('Attempting to initialize Firebase...');

        if (!getApps().length) {
            console.log("Initializing new Firebase app...");
            app = initializeApp(firebaseConfig);
             if (app) {
               console.log("Firebase app initialized successfully.");
            }
        } else {
            console.log("Getting existing Firebase app...");
            app = getApp();
             if (app) {
                console.log("Firebase app retrieved successfully.");
            }
        }

        // Initializing firebase services
        if (app) {
            console.log("Firebase app initialized/retrieved successfully.");
            try {
                auth = getAuth(app);
                
                console.log("Firebase Auth initialized successfully.");
                 console.log("Firebase Auth initialized successfully: OK");
            } catch (e) {
                console.log("Firebase Auth initialized successfully: FAILED");
                console.error("Error initializing Firebase Auth:", e);
            }
             console.log("Attempting to initialize Firestore...");
            try {
                
                db = getFirestore(app);
                 if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
            console.log('Connecting to Firestore emulator...');
            connectFirestoreEmulator(db, process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST, 8080);
        }
        if (db) {
            // Only apply settings on the client-side
            if (typeof window !== 'undefined') {
                db.settings({ experimentalForceLongPolling: true });
            }
                }

                console.log("Firestore initialized successfully.");
                if (db && db._delegate && db._delegate._databaseId && db._delegate._databaseId.host) {
                    console.log("Firestore host and port:", db._delegate._databaseId.host);
                }

                if (db) {
                  console.log("Firestore db.app.options:", db.app.options);
                }
            } catch (e) {
                 console.log("Firestore initialized successfully: FAILED");
                console.error("Error initializing Firestore:", e);
            }
             console.log("Attempting to initialize Firebase Functions...");
            try {
                functions = getFunctions(app);
                console.log("Firebase Functions initialized successfully.");
                 if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST) {
             console.log('Connecting to Functions emulator...');
            connectFunctionsEmulator(functions, process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST, 5001);
        }
                console.log("Firebase Functions initialized successfully: OK");
            } catch (e) {
                 console.log("Firebase Functions initialized successfully: FAILED");
                console.error("Error initializing Firebase Functions:", e);
            }
        } else {
            console.error("Firebase app object is null after initialization attempt.");
        }

    } catch (error: any) {
        console.error("Firebase initialization failed with error:", error);
        // Specifically check for auth/invalid-api-key which is common
        if (error.code === 'auth/invalid-api-key' || (error.message && error.message.includes('invalid-api-key'))) {
            // Initializing firebase services
             console.error("Error details: Invalid API Key. Please verify NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file matches your Firebase project's web app configuration.");
        } else if (error.message && error.message.includes('auth/configuration-not-found')) {
             console.error('Error details: Auth configuration not found. Ensure Email/Password sign-in method is enabled in your Firebase Console -> Authentication -> Sign-in method.');
        }
    }
}

// Log final state of services
console.log('Final Firebase Service Status:', {
    app: !!app,
    auth: !!auth,
    db: !!db,
    functions: !!functions
});

// Export the potentially null services. Consumers must check for null.
export { app, auth, db, functions };
export { firebaseConfig }; // Export config for reference if needed elsewhere
