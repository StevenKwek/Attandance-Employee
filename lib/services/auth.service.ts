/**
 * Auth Service — client-side Firebase Authentication.
 * Handles register, login, and logout via Firebase Auth SDK.
 */

"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { RegisterPayload, LoginPayload, UserDocument, UserRole } from "@/lib/types";

export interface LoginResult {
  idToken: string;
  uid: string;
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Creates a Firebase Auth user and saves their profile to Firestore.
 * Role defaults to "employee" when not provided.
 */
export async function registerUser(
  payload: RegisterPayload
): Promise<UserDocument> {
  const { name, email, password, role = "employee" } = payload;

  // 1. Create auth account
  const credential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const uid = credential.user.uid;

  // 2. Persist user profile in Firestore before continuing
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    name,
    email,
    role: role as UserRole,
    createdAt: serverTimestamp(),
  });

  return {
    id: uid,
    name,
    email,
    role: role as UserRole,
    // createdAt is a server timestamp; cast to satisfy type
    createdAt: null as unknown as UserDocument["createdAt"],
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Signs in with email/password and returns the Firebase ID token.
 * The token must be sent as `Authorization: Bearer <token>` to protected API routes.
 */
export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const { email, password } = payload;
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    uid: credential.user.uid,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ─── Get current ID token ─────────────────────────────────────────────────────

/**
 * Returns a fresh ID token for the currently signed-in user.
 * Pass `forceRefresh = true` when the token may be expired (> 1 h).
 */
export async function getCurrentIdToken(
  forceRefresh = false
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
