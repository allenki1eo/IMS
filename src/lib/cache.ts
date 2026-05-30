type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateExact(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton — one cache per server process
export const cache = new TTLCache();

// TTL constants (ms)
export const TTL = {
  COMPANY:      10 * 60 * 1000,   // 10 min  — company profile, branches
  SETTINGS:     10 * 60 * 1000,   // 10 min  — system settings
  PERMISSIONS:   2 * 60 * 1000,   //  2 min  — user permissions (security-sensitive)
  REFERENCE:     5 * 60 * 1000,   //  5 min  — categories, UOMs, warehouses, vehicles, suppliers
  STATS:         2 * 60 * 1000,   //  2 min  — dashboard stats
  TRENDS:       10 * 60 * 1000,   // 10 min  — monthly trend charts (slow aggregations)
  SESSION:       5 * 60 * 1000,   //  5 min  — session validation
} as const;

// Cache key helpers
export const cacheKey = {
  company:     (id: string) => `company:${id}`,
  settings:    (companyId: string) => `settings:${companyId}`,
  permissions: (userId: string) => `permissions:${userId}`,
  warehouses:  (companyId: string) => `warehouses:${companyId}`,
  categories:  (companyId: string) => `categories:${companyId}`,
  uoms:        (companyId: string) => `uoms:${companyId}`,
  vehicles:    (companyId: string) => `vehicles:${companyId}`,
  drivers:     (companyId: string) => `drivers:${companyId}`,
  suppliers:   (companyId: string) => `suppliers:${companyId}`,
  stats:       (companyId: string) => `stats:${companyId}`,
  trends:      (companyId: string, months: number) => `trends:${companyId}:${months}`,
  session:     (tokenHash: string) => `session:${tokenHash}`,
};
