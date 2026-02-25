import { useDataCache } from "#imports";
import { serverSupabaseClient } from "#supabase/server";
import type { ThumbnailsResponse } from "#shared/types/media";
import { useEventThumbnailsCacheKey } from "#shared/utils/cacheKeys";
import { generatePresignedUrl } from "~~/server/utils/conversions";

const MAX_THUMBNAILS = 5;

export default defineEventHandler(
  async (event): Promise<ThumbnailsResponse> => {
    const idParam = getRouterParam(event, "id");

    if (!idParam) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Event ID",
      });
    }

    const id = +idParam;
    const cacheKey = useEventThumbnailsCacheKey(id.toString());
    const cacheLength = 3600;

    const { value, addToCache } = await useDataCache<ThumbnailsResponse>(
      cacheKey,
      event,
    );
    if (value) {
      return value;
    }

    const client = await serverSupabaseClient(event);

    // Fetch up to MAX_THUMBNAILS ready media with thumbnail variants
    const { data: readyMedia } = await client
      .from("event-media")
      .select(
        `
        ...media!inner (
          id,
          status,
          media_variants!inner (
            variant_type,
            bucket,
            storage_path
          )
        )
      `,
      )
      .eq("event_id", id)
      .eq("media.status", "ready")
      .eq("media.media_variants.variant_type", "thumbnail")
      .limit(MAX_THUMBNAILS);

    // Count pending/processing items
    const { count: processingCount } = await client
      .from("event-media")
      .select("media!inner(id)", { count: "exact", head: true })
      .eq("event_id", id)
      .in("media.status", ["pending", "processing"]);

    // Generate presigned URLs for the thumbnails
    const thumbnails: string[] = [];
    if (readyMedia) {
      for (const item of readyMedia) {
        const variant = (item as any).media_variants?.[0];
        if (variant) {
          try {
            const url = await generatePresignedUrl(
              variant.bucket,
              variant.storage_path,
              cacheLength,
            );
            thumbnails.push(url);
          } catch (e) {
            console.error("Failed to generate thumbnail URL", e);
          }
        }
      }
    }

    const response: ThumbnailsResponse = {
      thumbnails,
      hasProcessing: (processingCount ?? 0) > 0,
      processingCount: processingCount ?? 0,
    };

    await addToCache(response, [`event:${id}`], cacheLength);

    return response;
  },
);
