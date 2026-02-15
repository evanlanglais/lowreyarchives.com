type CacheEntry<T> = { data: T; expiresAt: number };

export type CacheLoader<P extends any[], T> = {
  (...params: P): Promise<T>;
  /** Remove the cached entry for the given params so the next call refetches. */
  invalidate: (...params: P) => void;
  /** Remove all cached entries for this loader. */
  invalidateAll: () => void;
};

/**
 * Normalize params to produce a stable cache key regardless of
 * whether values are passed as strings or numbers (e.g. route
 * params "123" vs numeric 123 produce the same key).
 */
function cacheKey(params: unknown[]): string {
  return JSON.stringify(params, (_key, value) =>
    typeof value === "number" ? String(value) : value,
  );
}

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute

export function createCacheLoader<P extends any[], T>(
  fetcher: (...params: P) => Promise<T>,
  options?: { ttlMs?: number },
): CacheLoader<P, T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const cache = new Map<string, CacheEntry<T>>();
  const pending = new Map<string, Promise<T>>();

  const loader = ((...params: P): Promise<T> => {
    const key = cacheKey(params);
    const now = Date.now();

    // 1) if we have a valid cached value, return it immediately
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      return Promise.resolve(hit.data);
    }

    // 2) if there's already a request in‐flight for this key, return that promise
    if (pending.has(key)) {
      return pending.get(key)!;
    }

    // 3) otherwise, fire one request…
    const promise = fetcher(...params)
      .then((data) => {
        // …cache its result
        cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        pending.delete(key);
        return data;
      })
      .catch((err) => {
        pending.delete(key);
        throw err;
      });

    pending.set(key, promise);
    return promise;
  }) as CacheLoader<P, T>;

  loader.invalidate = (...params: P) => {
    cache.delete(cacheKey(params));
  };

  loader.invalidateAll = () => {
    cache.clear();
  };

  return loader;
}
