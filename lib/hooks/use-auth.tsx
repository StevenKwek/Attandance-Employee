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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Timeout after 5s in case Firestore is blocked/offline
          const snap = await Promise.race([
            getDoc(doc(db, "users", firebaseUser.uid)),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 3000)
            ),
          ]);
          if (snap && "exists" in snap && snap.exists()) {
            setProfile({ id: snap.id, ...(snap.data() as Omit<UserDocument, "id">) });
          }
        } catch {
          // Firestore unavailable — proceed without profile
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
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
