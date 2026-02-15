import { defineStore } from "pinia";
import { createCacheLoader, type CacheLoader } from "~/utils/cache";

type ApiMethods<Handlers extends Record<string, { fetcher: any }>> = {
  [P in keyof Handlers]: CacheLoader<
    Parameters<Handlers[P]["fetcher"]>,
    Awaited<ReturnType<Handlers[P]["fetcher"]>>
  >;
};

export function defineApiStore<
  Handlers extends Record<string, { fetcher: any }>,
>(storeId: string, handlers: Handlers, options?: { ttlMs?: number }) {
  return defineStore(storeId, () => {
    // 2️⃣ use the alias instead of an anonymous mapped type
    const api = {} as ApiMethods<Handlers>;

    for (const key in handlers) {
      api[key as keyof Handlers] = createCacheLoader(handlers[key].fetcher, {
        ttlMs: options?.ttlMs,
      }) as any;
    }

    return api;
  });
}
