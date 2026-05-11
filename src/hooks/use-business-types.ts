'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BusinessTypeRow {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch active business types for dropdowns.
 * Falls back to empty array if API fails.
 */
export function useBusinessTypes() {
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/business-types?active=true');
      if (res.ok) {
        const data: BusinessTypeRow[] = await res.json();
        setBusinessTypes(data.map((bt) => bt.name));
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

  return { businessTypes, loading, refetch: fetchTypes };
}
