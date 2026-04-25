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
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
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

      set({ user: data.user, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null });
    }
  },
}));
