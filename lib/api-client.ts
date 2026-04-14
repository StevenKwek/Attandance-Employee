/**
 * Authenticated API client — client-side only.
 * Automatically attaches the Firebase ID token to every request.
 */

"use client";

import { auth } from "@/lib/firebase/config";

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error ?? `API error ${res.status}`);
  }

  return json.data as T;
}
