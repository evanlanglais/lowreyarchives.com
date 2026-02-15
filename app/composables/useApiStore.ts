import { defineStore } from "pinia";
import { createCacheLoader, type CacheLoader } from "~/utils/cache";

type Fetcher = (...args: any[]) => Promise<any>;

type StoreApi<Handlers extends Record<string, { fetcher: Fetcher }>> = {
  [P in keyof Handlers]: (
    ...args: Parameters<Handlers[P]["fetcher"]>
  ) => Promise<Awaited<ReturnType<Handlers[P]["fetcher"]>>>;
} & {
  /** Invalidate a specific cached entry by handler name and params. */
  invalidateCache: <K extends keyof Handlers>(
    key: K,
    ...args: Parameters<Handlers[K]["fetcher"]>
  ) => void;
  /** Invalidate all cached entries for a handler. */
  invalidateCacheAll: <K extends keyof Handlers>(key: K) => void;
};

export function defineApiStore<
  Handlers extends Record<string, { fetcher: Fetcher }>,
>(storeId: string, handlers: Handlers, options?: { ttlMs?: number }) {
  return defineStore(storeId, () => {
    const loaders = {} as Record<keyof Handlers, CacheLoader<any[], any>>;
    const api = {} as StoreApi<Handlers>;

    for (const key in handlers) {
      const loader = createCacheLoader(handlers[key].fetcher, {
        ttlMs: options?.ttlMs,
      });
      loaders[key as keyof Handlers] = loader;
      (api as any)[key] = (...args: any[]) => loader(...args);
    }

    api.invalidateCache = (key, ...args) => {
      loaders[key].invalidate(...args);
    };

    api.invalidateCacheAll = (key) => {
      loaders[key].invalidateAll();
    };

    return api;
  });
}
