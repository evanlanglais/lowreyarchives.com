/**
 * Invalidate specific cache keys using the nuxt-multi-cache data storage.
 *
 * Use this when you know the exact cache keys to invalidate.
 * For logical invalidation, prefer `invalidateByTags()`.
 */
export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  try {
    const { cache } = useMultiCacheApp();
    const dataStorage = cache.data?.storage;
    if (dataStorage) {
      await Promise.all(keys.map((key) => dataStorage.removeItem(key)));
      console.log(`Cache keys invalidated: ${keys.join(", ")}`);
    } else {
      console.warn("Data cache storage not available");
    }
  } catch (e) {
    console.warn("Failed to invalidate cache keys:", e);
  }
}

/**
 * Invalidate caches by tags using the nuxt-multi-cache CacheTagInvalidator.
 *
 * This is the preferred method for cache invalidation as it decouples
 * the invalidation logic from the cache key structure.
 *
 * Example tags:
 * - `event:123` - All caches related to event 123
 * - `media:456` - All caches containing media 456
 * - `group:789` - All caches related to group 789
 *
 * The caching code declares what tags apply to each cache entry,
 * and the invalidation code just specifies the logical entity.
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  try {
    const { cacheTagInvalidator } = useMultiCacheApp();
    cacheTagInvalidator.add(tags);
    console.log(`Cache tag invalidation queued: ${tags.join(", ")}`);
  } catch (e) {
    console.warn("Failed to invalidate cache by tags:", e);
  }
}

/**
 * Invalidate all caches related to a specific event using tags.
 * Any cache entry tagged with `event:{eventId}` will be invalidated.
 */
export async function invalidateEventCaches(
  eventId: number,
  groupIds?: number[],
): Promise<void> {
  const tags = [`event:${eventId}`];

  if (groupIds && groupIds.length > 0) {
    for (const groupId of groupIds) {
      tags.push(`group:${groupId}`);
    }
  }

  await invalidateByTags(tags);
}

/**
 * Invalidate caches related to a specific media item.
 * Any cache entry tagged with `media:{mediaId}` will be invalidated.
 *
 * This is useful when media status changes (pending -> ready)
 * without knowing which events contain that media.
 */
export async function invalidateMediaCaches(
  mediaId: number,
): Promise<void> {
  await invalidateByTags([`media:${mediaId}`]);
}

/**
 * Invalidate media-related caches for an event.
 * Call this when media is uploaded, processed, or status changes.
 *
 * @deprecated Prefer `invalidateEventCaches()` or `invalidateMediaCaches()`
 * which use tag-based invalidation for better extensibility.
 */
export async function invalidateEventMediaCache(
  eventId: number,
): Promise<void> {
  await invalidateByTags([`event:${eventId}`]);
}
