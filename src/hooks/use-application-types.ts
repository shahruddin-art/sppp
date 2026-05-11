'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ApplicationTypeRow {
  id: string;
  code: string;
  label: string;
  ppkpRoute: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch active application types for dropdowns.
 * Returns array of {code, label, ppkpRoute} objects.
 * Falls back to empty array if API fails.
 */
export function useApplicationTypes() {
  const [applicationTypes, setApplicationTypes] = useState<ApplicationTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/application-types?active=true');
      if (res.ok) {
        const data: ApplicationTypeRow[] = await res.json();
        setApplicationTypes(data);
      }
    } catch {
      // Silently fail - dropdown will be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { applicationTypes, loading, refetch: fetchTypes };
}
