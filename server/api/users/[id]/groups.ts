import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Event ID",
    });
  }

  const client = await serverSupabaseClient(event);

  const { data, error } = await client
    .from("group-users")
    .select(`...groups (*)`)
    .eq("user_id", id)
    .returns<Array<Tables<"groups">>>();

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to load groups",
    });
  }

  return data;
});
