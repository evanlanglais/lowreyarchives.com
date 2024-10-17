import { useDataCache } from "#nuxt-multi-cache/composables";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Tables } from "~/types/supabase";
import { EventWrapper } from "~/types/event";
import { useGroupEventsCacheKey } from "~/composable/group";

export default defineEventHandler(
  async (event): Promise<Array<EventWrapper>> => {
    const idParam = getRouterParam(event, "id");

    if (!idParam) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid group ID",
      });
    }

    const id = +idParam;

    const cacheKey = useGroupEventsCacheKey(id.toString());

    const { value, addToCache } = await useDataCache<EventWrapper[]>(
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
      .from("group-events")
      .select(`...events (*)`)
      .eq("group_id", id)
      .returns<Array<Tables<"events">>>();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Unable to load group events`,
      });
    }

    await addToCache(data, [], 3600);

    return data;
  },
);
