/**
 * Firebase Client SDK — initializes the client-side Firebase app.
 * Used in browser/client components for Authentication and real-time Firestore reads.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Prevent duplicate initialization in Next.js hot-reload
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);

// Persist login across browser sessions (survives tab/window close)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

const db: Firestore = getFirestore(app);

export { app, auth, db };
