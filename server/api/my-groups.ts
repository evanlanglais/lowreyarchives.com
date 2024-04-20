import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);

  if (!user) {
    console.log("idk why");
    console.log(user);
    throw createError({
      statusCode: 401,
      statusMessage: "User not authenticated!",
    });
  }

  const client = await serverSupabaseClient(event);

  const { data, error } = await client
    .from("group-users")
    .select(`...groups (*)`)
    .eq("user_id", user.id)
    .returns<Array<Tables<"groups">>>();
  if (error)
    throw createError({
      statusCode: 500,
      statusMessage: "User not authenticated!",
    });

  return data;
});
