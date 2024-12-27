import { useDataCache } from "#nuxt-multi-cache/composables";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";
import { mediaWrapperFromDatabaseMediaRow } from "~/server/utils/conversions";
import { MediaWrapper } from "~/types/media";
import { useEventMediaCacheKey } from "~/composable/event";

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

    const { data, error } = await client
      .from("event-media")
      .select(`...media (*)`)
      .eq("event_id", id)
      .returns<Array<Tables<"media">>>();

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
            return await mediaWrapperFromDatabaseMediaRow(
              event,
              cacheLength,
              mediaRow,
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
