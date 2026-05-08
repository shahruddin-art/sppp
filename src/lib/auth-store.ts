'use client';

import { create } from 'zustand';

export interface UserSession {
  id: string;
  username: string;
  role: string;
  name: string;
  zone: string | null;
  email?: string | null;
  phone?: string | null;
}

interface AuthState {
  user: UserSession | null;
  sessionToken: string | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserSession | null) => void;
  setSessionToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),
  setSessionToken: (token) => set({ sessionToken: token }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      // Try to restore session from localStorage first
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      if (savedToken) {
        set({ sessionToken: savedToken });
        // Validate the token with the server
        const res = await fetch('/api/auth/session', {
          headers: { 'Authorization': `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          set({ user: data.user || null, initialized: true });
          return;
        }
        // Token invalid, clear it
        localStorage.removeItem('sessionToken');
        set({ sessionToken: null });
      }

      // Fallback: try cookie-based session
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user || null, initialized: true });
      } else {
        set({ user: null, initialized: true });
      }
    } catch {
      set({ user: null, initialized: true });
    }
  },

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Log masuk gagal');
      }

      // Store session token from response
      if (data.token) {
        set({ sessionToken: data.token, user: data.user, loading: false });
        localStorage.setItem('sessionToken', data.token);
      } else {
        set({ user: data.user, loading: false });
      }
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, sessionToken: null });
      localStorage.removeItem('sessionToken');
    }
  },
}));

/**
 * Get the current session token for API requests
 */
export function getSessionToken(): string | null {
  // Try zustand store first
  const storeToken = useAuthStore.getState().sessionToken;
  if (storeToken) return storeToken;
  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionToken');
  }
  return null;
}
