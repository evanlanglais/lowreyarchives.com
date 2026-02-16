import { useNitroApp } from "nitropack/runtime";
import {
  useEventMediaCacheKey,
  useEventInfoCacheKey,
  useEventDetailsCacheKey,
  useEventThumbnailsCacheKey,
  useGroupEventsCacheKey,
} from "#shared/utils/cacheKeys";

function getDataStorage() {
  const multiCache = (useNitroApp() as any).multiCache;
  return multiCache?.cache?.data?.storage;
}

/**
 * Immediately remove specific cache keys from the data cache storage.
 */
export async function removeKeys(keys: string[]): Promise<void> {
  const storage = getDataStorage();
  if (!storage) {
    console.warn("Data cache storage not available");
    return;
  }
  await Promise.all(keys.map((key) => storage.removeItem(key)));
  console.log(`Cache keys invalidated: ${keys.join(", ")}`);
}

/**
 * Remove all cache keys matching a given prefix.
 * Useful for caches with dynamic key suffixes (pagination, filters).
 */
async function removeByPrefix(prefix: string): Promise<void> {
  const storage = getDataStorage();
  if (!storage) {
    console.warn("Data cache storage not available");
    return;
  }
  const keys = await storage.getKeys(prefix);
  if (keys.length > 0) {
    await Promise.all(keys.map((key: string) => storage.removeItem(key)));
    console.log(`Cache keys invalidated by prefix "${prefix}": ${keys.join(", ")}`);
  }
}

/**
 * Invalidate all caches related to a specific event.
 */
export async function invalidateEventCaches(
  eventId: number,
  groupIds?: number[],
): Promise<void> {
  const id = String(eventId);
  const keys = [
    useEventInfoCacheKey(id),
    useEventDetailsCacheKey(id),
    useEventMediaCacheKey(id),
    useEventThumbnailsCacheKey(id),
  ];

  if (groupIds && groupIds.length > 0) {
    for (const groupId of groupIds) {
      keys.push(useGroupEventsCacheKey(String(groupId)));
    }
  }

  await removeKeys(keys);
}

/**
 * Invalidate caches that contain a specific media item.
 * Since media is accessed through events, this requires the event ID.
 */
export async function invalidateMediaCaches(
  mediaId: number,
  eventId?: number,
): Promise<void> {
  const keys: string[] = [];

  if (eventId) {
    const id = String(eventId);
    keys.push(useEventMediaCacheKey(id), useEventThumbnailsCacheKey(id));
  }

  if (keys.length > 0) {
    await removeKeys(keys);
  }
}

/**
 * Invalidate media-related caches for an event.
 * Call this when media is uploaded, processed, or status changes.
 */
export async function invalidateEventMediaCache(
  eventId: number,
): Promise<void> {
  await invalidateEventCaches(eventId);
}

/**
 * Invalidate all cached event lists for a user.
 * The user events endpoint uses dynamic keys with pagination/filter suffixes,
 * so we purge by prefix.
 */
export async function invalidateUserEventsCaches(
  userId: string,
): Promise<void> {
  await removeByPrefix(`user-events:${userId}:`);
}

/**
 * Invalidate caches after a new event is created.
 * Purges the creator's event lists, and group event caches for any groups
 * the event was shared with.
 */
export async function invalidateNewEventCaches(
  userId: string,
  groupIds?: number[],
): Promise<void> {
  await invalidateUserEventsCaches(userId);

  if (groupIds && groupIds.length > 0) {
    const keys = groupIds.map((gid) => useGroupEventsCacheKey(String(gid)));
    await removeKeys(keys);
  }
}
