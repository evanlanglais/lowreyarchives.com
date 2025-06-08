import { serverSupabaseUser } from "#supabase/server";
import { GroupWrapper } from "#shared/types/group";

export default defineEventHandler(async (event): Promise<GroupWrapper[]> => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid user session",
    });
  }

  return await $fetch(`/api/users/${user.id}/groups`, event);
});
