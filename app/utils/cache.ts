type CacheEntry<T> = { data: T; expiresAt: number };

export function createCacheLoader<P extends any[], T>(
  fetcher: (...params: P) => Promise<T>,
  options?: { ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // default 5 min
  const cache = new Map<string, CacheEntry<T>>();
  const pending = new Map<string, Promise<T>>();

  return (...params: P): Promise<T> => {
    const key = JSON.stringify(params);
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
  };
}
