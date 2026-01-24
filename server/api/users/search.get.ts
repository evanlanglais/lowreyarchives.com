import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { UserProfile } from "#shared/types/user";

export default defineEventHandler(async (event): Promise<UserProfile[]> => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const query = getQuery(event);
  const searchQuery = String(query.q || "").trim();

  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }

  const client = await serverSupabaseClient(event);

  // Search users by name or email (RLS ensures we only see users in shared groups)
  const { data: profiles, error } = await client
    .from("user_profiles")
    .select("id, email, display_name, avatar_url")
    .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    .limit(20);

  if (error) {
    console.error("Error searching users:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to search users",
    });
  }

  return profiles || [];
});
