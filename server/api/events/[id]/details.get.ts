import { useDataCache } from "#imports";
import { serverSupabaseClient } from "#supabase/server";
import type { EventDetailsResponse } from "#shared/types/event";
import type { UserProfile } from "#shared/types/user";
import { useEventDetailsCacheKey } from "#shared/utils/cacheKeys";

export default defineEventHandler(
  async (event): Promise<EventDetailsResponse> => {
    const idParam = getRouterParam(event, "id");

    if (!idParam) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Event ID",
      });
    }

    const id = +idParam;

    const cacheKey = useEventDetailsCacheKey(id.toString());
    const { value, addToCache } = await useDataCache<EventDetailsResponse>(
      cacheKey,
      event,
    );
    if (value) {
      console.log(`cache hit ${cacheKey}`);
      return value;
    }

    console.log(`cache miss ${cacheKey}`);

    const client = await serverSupabaseClient(event);

    const [tagsResult, groupsResult, usersResult] = await Promise.all([
      client.from("events").select("tags").eq("id", id).single(),
      client
        .from("group-events")
        .select("group_id, groups(id, group_name)")
        .eq("event_id", id),
      client
        .from("user-events")
        .select(
          "relationship_type, user_id, user_profiles(id, email, display_name, avatar_url)",
        )
        .eq("event_id", id)
        .in("relationship_type", ["tagged", "shared"]),
    ]);

    if (tagsResult.error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load event tags: ${tagsResult.error.message}`,
      });
    }

    const tags: string[] = tagsResult.data?.tags ?? [];

    const groups: EventDetailsResponse["groups"] = (groupsResult.data ?? [])
      .map((row: any) => row.groups)
      .filter(Boolean);

    const taggedUsers: UserProfile[] = [];
    const sharedUsers: UserProfile[] = [];

    for (const row of usersResult.data ?? []) {
      const profile = (row as any).user_profiles as UserProfile | null;
      if (!profile) continue;

      if (row.relationship_type === "tagged") {
        taggedUsers.push(profile);
      } else if (row.relationship_type === "shared") {
        sharedUsers.push(profile);
      }
    }

    const result: EventDetailsResponse = {
      tags,
      groups,
      taggedUsers,
      sharedUsers,
    };

    await addToCache(result, [`event:${id}`], 3600);

    return result;
  },
);
