import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import {
  useEventDetailsCacheKey,
  useEventInfoCacheKey,
  useGroupEventsCacheKey,
} from "#shared/utils/cacheKeys";
import {
  removeKeys,
  invalidateUserEventsCaches,
} from "~~/server/utils/cache-invalidation";

type UpdateSharingRequest = {
  groupIds: number[];
  taggedUserIds: string[];
  sharedUserIds: string[];
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const idParam = getRouterParam(event, "id");
  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Event ID" });
  }
  const id = +idParam;

  const body = await readBody<UpdateSharingRequest>(event);

  const groupIds = body.groupIds ?? [];
  const taggedUserIds = body.taggedUserIds ?? [];
  const sharedUserIds = body.sharedUserIds ?? [];

  const client = await serverSupabaseClient(event);

  // 1. Fetch current group-events for cache invalidation of old groups
  const { data: currentGroupEvents } = await client
    .from("group-events")
    .select("group_id")
    .eq("event_id", id);

  const oldGroupIds = (currentGroupEvents ?? []).map(
    (row: any) => row.group_id as number,
  );

  // 2. Delete all group-events for this event
  const { error: deleteGroupsError } = await client
    .from("group-events")
    .delete()
    .eq("event_id", id);

  if (deleteGroupsError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update group sharing: ${deleteGroupsError.message}`,
    });
  }

  // 3. Insert new group-events
  if (groupIds.length > 0) {
    const groupEventRecords = groupIds.map((groupId) => ({
      group_id: groupId,
      event_id: id,
    }));

    const { error: insertGroupsError } = await client
      .from("group-events")
      .insert(groupEventRecords);

    if (insertGroupsError) {
      console.error("Failed to insert group-events:", insertGroupsError);
    }
  }

  // 4. Delete all non-creator user-events for this event
  const { error: deleteUsersError } = await client
    .from("user-events")
    .delete()
    .eq("event_id", id)
    .in("relationship_type", ["tagged", "shared"]);

  if (deleteUsersError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update user sharing: ${deleteUsersError.message}`,
    });
  }

  // 5. Insert new tagged user-events
  const userEventRecords: Array<{
    user_id: string;
    event_id: number;
    relationship_type: "tagged" | "shared";
  }> = [];

  for (const userId of taggedUserIds) {
    userEventRecords.push({
      user_id: userId,
      event_id: id,
      relationship_type: "tagged",
    });
  }

  for (const userId of sharedUserIds) {
    userEventRecords.push({
      user_id: userId,
      event_id: id,
      relationship_type: "shared",
    });
  }

  if (userEventRecords.length > 0) {
    const { error: insertUsersError } = await client
      .from("user-events")
      .insert(userEventRecords);

    if (insertUsersError) {
      console.error("Failed to insert user-events:", insertUsersError);
    }
  }

  // 6. Invalidate caches
  const allGroupIds = [...new Set([...oldGroupIds, ...groupIds])];
  const cacheKeys = [
    useEventDetailsCacheKey(id.toString()),
    useEventInfoCacheKey(id.toString()),
    ...allGroupIds.map((gid) => useGroupEventsCacheKey(gid.toString())),
  ];

  await removeKeys(cacheKeys);
  await invalidateUserEventsCaches(user.sub);

  return { success: true };
});
