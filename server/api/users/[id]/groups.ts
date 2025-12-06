import { useDataCache } from '#imports';
import { serverSupabaseClient } from "#supabase/server";
import type { Tables } from "#shared/types/database.types";
import type { GroupWrapper } from "#shared/types/group";
import { useUserGroupsCacheKey } from "#shared/utils/cacheKeys";

export default defineEventHandler(async (event): Promise<GroupWrapper[]> => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid user ID",
    });
  }

  const cacheKey = useUserGroupsCacheKey(id);

  const { value, addToCache } = await useDataCache<GroupWrapper[]>(
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
    .from("group-users")
    .select(`...groups (*)`)
    .eq("user_id", id)
    .overrideTypes<Array<Tables<"groups">>>();

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to load groups",
    });
  }

  await addToCache(data, [], 3600);

  return data;
});
