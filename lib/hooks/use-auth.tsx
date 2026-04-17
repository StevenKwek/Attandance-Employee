"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserDocument } from "@/lib/types";

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Firebase Auth user, null when signed out */
  user: User | null;
  /** Firestore profile document for the current user */
  profile: UserDocument | null;
  /** True while resolving the initial auth state */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let authRequestId = 0;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const requestId = ++authRequestId;
      setLoading(true);
      setUser(firebaseUser);
      setProfile(null);

      if (firebaseUser) {
        let nextProfile: UserDocument | null = null;

        // 1. Prefer the server API so role resolution stays consistent with protected routes.
        try {
          const token = await firebaseUser.getIdToken(true);
          const res = await fetch(`/api/users/${firebaseUser.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();

          if (res.ok && json.success && json.data) {
            nextProfile = json.data as UserDocument;
          }
        } catch {
          // API unavailable — fall back to Firestore
        }

        // 2. Fallback to Firestore read for resilience in local/dev environments.
        if (!nextProfile) {
          try {
            const snap = await Promise.race([
              getDoc(doc(db, "users", firebaseUser.uid)),
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 2000)
              ),
            ]);

            if (snap && "exists" in snap && snap.exists()) {
              nextProfile = {
                id: snap.id,
                ...(snap.data() as Omit<UserDocument, "id">),
              };
            }
          } catch {
            // Both failed — profile stays null
          }
        }

        if (cancelled || requestId !== authRequestId) {
          return;
        }

        setProfile(nextProfile);
      }

      if (cancelled || requestId !== authRequestId) {
        return;
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** Returns initials from a display name (up to 2 chars). */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
