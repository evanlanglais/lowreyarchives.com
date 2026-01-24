import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { GroupWithMembers, UserProfile } from "#shared/types/user";

export default defineEventHandler(async (event): Promise<{ groups: GroupWithMembers[] }> => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = user.sub;
  if (!userId) {
    console.error("User object has no id:", user);
    throw createError({
      statusCode: 500,
      statusMessage: "Invalid user session",
    });
  }

  const client = await serverSupabaseClient(event);

  // Get all groups the user is a member of
  const { data: userGroups, error: groupsError } = await client
    .from("group-users")
    .select(`
      group_id,
      groups (
        id,
        group_name
      )
    `)
    .eq("user_id", userId);

  if (groupsError) {
    console.error("Error fetching user groups:", groupsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch groups",
    });
  }

  if (!userGroups || userGroups.length === 0) {
    return { groups: [] };
  }

  const groupIds = userGroups.map((ug) => ug.group_id);

  // Get all members of these groups with their profiles (now works with FK to user_profiles)
  const { data: groupMembers, error: membersError } = await client
    .from("group-users")
    .select(`
      group_id,
      user_profiles (
        id,
        email,
        display_name,
        avatar_url
      )
    `)
    .in("group_id", groupIds);

  if (membersError) {
    console.error("Error fetching group members:", membersError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch group members",
    });
  }

  // Build the response structure
  const groupsMap = new Map<number, GroupWithMembers>();

  for (const ug of userGroups) {
    const group = ug.groups as { id: number; group_name: string } | null;
    if (group) {
      groupsMap.set(group.id, {
        id: group.id,
        name: group.group_name,
        members: [],
      });
    }
  }

  for (const gm of groupMembers || []) {
    const profile = gm.user_profiles as UserProfile | null;
    const groupData = groupsMap.get(gm.group_id);
    if (profile && groupData) {
      // Avoid duplicates
      if (!groupData.members.some((m) => m.id === profile.id)) {
        groupData.members.push(profile);
      }
    }
  }

  return { groups: Array.from(groupsMap.values()) };
});
