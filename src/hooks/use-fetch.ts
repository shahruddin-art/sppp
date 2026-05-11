'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, getSessionToken } from '@/lib/auth-store';

interface UseFetchOptions {
  refreshInterval?: number;
}

/**
 * Build headers with session token for authenticated API requests
 */
export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function useFetch<T>(url: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: buildAuthHeaders(),
      });

      // Handle 401 - session expired, force logout
      if (res.status === 401) {
        const authStore = useAuthStore.getState();
        authStore.setUser(null);
        authStore.setSessionToken(null);
        if (typeof window !== 'undefined') localStorage.removeItem('sessionToken');
        setError('Sesi telah tamat. Sila log masuk semula.');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch' }));
        throw new Error(errorData.error || 'Failed to fetch');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    if (options?.refreshInterval) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

export async function postData(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });

  // Handle 401 - session expired, force logout
  if (res.status === 401) {
    const authStore = useAuthStore.getState();
    authStore.setUser(null);
    authStore.setSessionToken(null);
    if (typeof window !== 'undefined') localStorage.removeItem('sessionToken');
    throw new Error('Sesi telah tamat. Sila log masuk semula.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

/**
 * Put data with authentication
 */
export async function putData(url: string, body: any) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });

  if (res.status === 401) {
    const authStore = useAuthStore.getState();
    authStore.setUser(null);
    authStore.setSessionToken(null);
    if (typeof window !== 'undefined') localStorage.removeItem('sessionToken');
    throw new Error('Sesi telah tamat. Sila log masuk semula.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

/**
 * Delete with authentication
 */
export async function deleteData(url: string) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    credentials: 'same-origin',
  });

  if (res.status === 401) {
    const authStore = useAuthStore.getState();
    authStore.setUser(null);
    authStore.setSessionToken(null);
    if (typeof window !== 'undefined') localStorage.removeItem('sessionToken');
    throw new Error('Sesi telah tamat. Sila log masuk semula.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}
