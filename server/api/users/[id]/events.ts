import { useDataCache } from "#nuxt-multi-cache/composables";
import { serverSupabaseClient } from "#supabase/server";
import type { Tables } from "#shared/types/database.types";
import type { EventWrapper } from "#shared/types/event";

export default defineEventHandler(async (event): Promise<EventWrapper[]> => {
  const id = getRouterParam(event, "id");
  const query = getQuery(event);
  
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 20;
  const offset = (page - 1) * pageSize;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid user ID",
    });
  }

  // Create a cache key including ID and pagination params
  const cacheKey = `user-events:${id}:page:${page}:size:${pageSize}`;
  // Cache for 5 minutes (300 seconds) or however long is appropriate
  const cacheDuration = 300;

  const { value, addToCache } = await useDataCache<EventWrapper[]>(
    cacheKey,
    event,
  );

  if (value) {
    // console.log(`cache hit ${cacheKey}`);
    return value;
  }
  
  // console.log(`cache miss ${cacheKey}`);

  const client = await serverSupabaseClient(event);

  // Fetch events from groups the user is in
  // and events directly assigned to the user
  // We use raw SQL or complex filters because OR filters across different tables are tricky in standard postgrest-js
  // However, a common pattern is to get the IDs first or use a joined view.
  // Given the structure, we can fetch from 'events' and filter where:
  // id IN (select event_id from "user-events" where user_id = X)
  // OR id IN (select event_id from "group-events" where group_id IN (select group_id from "group-users" where user_id = X))
  
  // PostgREST doesn't support complicated nested subqueries in 'in' filter easily in one go without a view or RPC.
  // But we can do it in two steps or use an RPC if available.
  // Here, we will try to fetch the relevant event IDs first.

  // 1. Get user's group IDs
  const { data: userGroups, error: groupsError } = await client
    .from("group-users")
    .select("group_id")
    .eq("user_id", id);

  if (groupsError) {
    throw createError({ statusCode: 500, statusMessage: "Error fetching groups" });
  }
  
  const groupIds = userGroups.map(g => g.group_id);

  // 2. Get event IDs from these groups
  let groupEventIds: number[] = [];
  if (groupIds.length > 0) {
    const { data: groupEvents, error: groupEventsError } = await client
      .from("group-events")
      .select("event_id")
      .in("group_id", groupIds);
      
    if (groupEventsError) {
       throw createError({ statusCode: 500, statusMessage: "Error fetching group events" });
    }
    groupEventIds = groupEvents.map(ge => ge.event_id);
  }

  // 3. Get event IDs directly assigned to user
  const { data: directUserEvents, error: userEventsError } = await client
    .from("user-events")
    .select("event_id")
    .eq("user_id", id);

  if (userEventsError) {
    throw createError({ statusCode: 500, statusMessage: "Error fetching user events" });
  }
  
  const userEventIds = directUserEvents.map(ue => ue.event_id);

  // Combine and deduplicate IDs
  const allEventIds = Array.from(new Set([...groupEventIds, ...userEventIds]));

  if (allEventIds.length === 0) {
    // Cache empty result too
    await addToCache([], [], cacheDuration);
    return [];
  }

  // 4. Fetch the actual events with pagination
  // We sort by start_date usually, or created_at
  const { data: events, error: eventsError } = await client
    .from("events")
    .select("*")
    .in("id", allEventIds)
    .order("start_date", { ascending: true })
    .range(offset, offset + pageSize - 1)
    .overrideTypes<Array<Tables<"events">>>();

  if (eventsError) {
    throw createError({ statusCode: 500, statusMessage: "Error fetching events details" });
  }

  await addToCache(events, [], cacheDuration);

  return events;
});