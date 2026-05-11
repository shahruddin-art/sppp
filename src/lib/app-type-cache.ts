import { db } from '@/lib/db';

// In-memory cache for application types to avoid repeated DB queries
let cachedAppTypes: Record<string, { label: string; ppkpRoute: string }> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Get application type config from database with caching.
 * Returns a map of code -> { label, ppkpRoute }
 */
export async function getApplicationTypeMap(): Promise<Record<string, { label: string; ppkpRoute: string }>> {
  const now = Date.now();
  if (cachedAppTypes && now < cacheExpiry) {
    return cachedAppTypes;
  }

  const types = await db.applicationType.findMany({
    where: { isActive: true },
    select: { code: true, label: true, ppkpRoute: true },
  });

  cachedAppTypes = {};
  for (const t of types) {
    cachedAppTypes[t.code] = { label: t.label, ppkpRoute: t.ppkpRoute };
  }
  cacheExpiry = now + CACHE_TTL;

  return cachedAppTypes;
}

/**
 * Get PPKP route for an application type code from database.
 * Falls back to 'PPKP_L' if not found.
 */
export async function getPPKPRoleFromDB(applicationType: string): Promise<'PPKP_L' | 'PPKP_P'> {
  const map = await getApplicationTypeMap();
  const config = map[applicationType];
  if (!config) return 'PPKP_L';
  return config.ppkpRoute as 'PPKP_L' | 'PPKP_P';
}

/**
 * Get application type label from database.
 * Falls back to the code itself if not found.
 */
export async function getApplicationTypeLabelFromDB(applicationType: string): Promise<string> {
  const map = await getApplicationTypeMap();
  const config = map[applicationType];
  return config?.label || applicationType;
}

/**
 * Invalidate the application type cache.
 * Call this when admin modifies application types.
 */
export function invalidateApplicationTypeCache(): void {
  cachedAppTypes = null;
  cacheExpiry = 0;
}
