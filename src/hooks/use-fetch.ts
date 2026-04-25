'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';

interface UseFetchOptions {
  refreshInterval?: number;
}

export function useFetch<T>(url: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(url);

      // Handle 401 - session expired, force logout
      if (res.status === 401) {
        const authStore = useAuthStore.getState();
        authStore.setUser(null);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Handle 401 - session expired, force logout
  if (res.status === 401) {
    const authStore = useAuthStore.getState();
    authStore.setUser(null);
    throw new Error('Sesi telah tamat. Sila log masuk semula.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}
