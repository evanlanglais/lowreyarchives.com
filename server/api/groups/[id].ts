import { useDataCache } from "#nuxt-multi-cache/composables";
import { serverSupabaseClient } from "#supabase/server";
import type { GroupWrapper } from "#shared/types/group";
import { useGroupInfoCacheKey } from "#shared/utils/cacheKeys";

export default defineEventHandler(async (event): Promise<GroupWrapper> => {
  const idParam = getRouterParam(event, "id");

  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid group ID",
    });
  }

  const id = +idParam;

  const cacheKey = useGroupInfoCacheKey(id.toString());

  const { value, addToCache } = await useDataCache<GroupWrapper>(
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
    .from("groups")
    .select(
      `id,
       group_name,
       group_description`,
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
