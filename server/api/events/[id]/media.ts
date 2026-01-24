import { useDataCache } from "#imports";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Tables } from "#shared/types/database.types";
import type { MediaWrapper } from "#shared/types/media";
import { useEventMediaCacheKey } from "#shared/utils/cacheKeys";

// Type for media with variants from joined query
type MediaWithVariants = Tables<"media"> & {
  media_variants: Array<{
    id: number;
    media_id: number;
    variant_type: string;
    bucket: string;
    storage_path: string;
    file_size: number | null;
    mime_type: string | null;
    width: number | null;
    height: number | null;
    duration_seconds: number | null;
    created_at: string;
  }>;
};

export default defineEventHandler(
  async (event): Promise<Array<MediaWrapper>> => {
    const idParam = getRouterParam(event, "id");

    if (!idParam) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Event ID",
      });
    }

    const id = +idParam;

    const cacheKey = useEventMediaCacheKey(id.toString());
    const cacheLength = 3600;

    const { value, addToCache } = await useDataCache<MediaWrapper[]>(
      cacheKey,
      event,
    );
    if (value) {
      console.log(`cache hit ${cacheKey}`);
      return value;
    }

    console.log(`cache miss ${cacheKey}`);

    const client = await serverSupabaseClient(event);

    // Fetch media with variants in a single query
    const { data, error } = await client
      .from("event-media")
      .select(
        `
        ...media (
          *,
          media_variants (
            id,
            media_id,
            variant_type,
            bucket,
            storage_path,
            file_size,
            mime_type,
            width,
            height,
            duration_seconds,
            created_at
          )
        )
      `,
      )
      .eq("event_id", id)
      .returns<Array<MediaWithVariants>>();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Unable to load event ${error.message}`,
      });
    }

    const transformedData = (
      await Promise.all(
        data.map(async (mediaRow): Promise<MediaWrapper | undefined> => {
          try {
            const { media_variants, ...mediaData } = mediaRow;
            return await mediaWrapperFromDatabaseMediaRow(
              event,
              cacheLength,
              mediaData as Tables<"media">,
              media_variants,
            );
          } catch (error) {
            console.log(error);
            return undefined;
          }
        }),
      )
    ).filter((mediaEntry) => !!mediaEntry);

    await addToCache(transformedData, [], cacheLength);

    return transformedData;
  },
);
