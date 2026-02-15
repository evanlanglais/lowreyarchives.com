import { invalidateMediaCaches, invalidateEventCaches } from "~~/server/utils/cache-invalidation";

type MediaProcessedWebhookBody = {
  mediaId: number;
  eventId?: number;
  status: "processing" | "ready" | "failed";
};

/**
 * Webhook endpoint for the media processor to notify when media status changes.
 * This invalidates the relevant caches so the frontend sees updated status immediately.
 *
 * Authentication: Requires x-nuxt-multi-cache-token header matching NUXT_MULTI_CACHE_API_TOKEN
 *
 * Usage from media processor:
 *   POST /api/webhooks/media-processed
 *   Headers: { "x-nuxt-multi-cache-token": "<token>" }
 *   Body: { "mediaId": 123, "eventId": 456, "status": "ready" }
 */
export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const expectedToken = runtimeConfig.multiCacheApiToken;

  // Verify authentication
  if (expectedToken) {
    const providedToken = getHeader(event, "x-nuxt-multi-cache-token");
    if (providedToken !== expectedToken) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: Invalid or missing token",
      });
    }
  } else {
    // If no token configured, reject all requests for security
    throw createError({
      statusCode: 503,
      statusMessage: "Cache API not configured",
    });
  }

  const body = await readBody<MediaProcessedWebhookBody>(event);

  if (!body.mediaId) {
    throw createError({
      statusCode: 400,
      statusMessage: "mediaId is required",
    });
  }

  // With tag-based invalidation, we can simply invalidate by media ID
  // Any cache tagged with `media:{mediaId}` will be invalidated automatically
  // No need to look up which events contain this media!
  await invalidateMediaCaches(body.mediaId);

  // If eventId is also provided, invalidate event-level caches too
  if (body.eventId) {
    await invalidateEventCaches(body.eventId);
  }

  console.log(
    `Media ${body.mediaId} status changed to ${body.status}, invalidated via tags`,
  );

  return {
    success: true,
    mediaId: body.mediaId,
    eventId: body.eventId,
  };
});
