/**
 * Firebase Admin SDK — server-side only.
 * Used exclusively in Next.js Route Handlers (app/api/**) and server actions.
 * Never import this in client components.
 */

import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    // Replace escaped newlines from env var
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  return initializeApp({ credential: cert(serviceAccount) });
}

const adminApp: App = getAdminApp();
const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
