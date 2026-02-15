import { useNitroApp } from "nitropack/runtime";
import {
  useEventMediaCacheKey,
  useEventInfoCacheKey,
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
async function removeKeys(keys: string[]): Promise<void> {
  const storage = getDataStorage();
  if (!storage) {
    console.warn("Data cache storage not available");
    return;
  }
  await Promise.all(keys.map((key) => storage.removeItem(key)));
  console.log(`Cache keys invalidated: ${keys.join(", ")}`);
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
