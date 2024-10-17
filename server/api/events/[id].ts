import { useDataCache } from "#nuxt-multi-cache/composables";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { EventWrapper } from "~/types/event";
import { useEventInfoCacheKey } from "~/composable/event";

export default defineEventHandler(async (event): Promise<EventWrapper> => {
  const idParam = getRouterParam(event, "id");

  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Event ID",
    });
  }

  const id = +idParam;

  const cacheKey = useEventInfoCacheKey(id.toString());

  const { value, addToCache } = await useDataCache<EventWrapper>(
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
    .from("events")
    .select(
      `id,
       title,
       description,
       start_date,
       end_date`,
    )
    .eq("id", id)
    .single();

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Unable to load event ${error.message}`,
    });
  }

  await addToCache(data, [], 3600);

  return data;
});
