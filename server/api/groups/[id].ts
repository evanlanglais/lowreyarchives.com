import { serverSupabaseClient } from "#supabase/server";
import { GroupWrapper } from "~/types/group";

export default defineEventHandler(async (event): Promise<GroupWrapper> => {
  const idParam = getRouterParam(event, "id");

  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid group ID",
    });
  }

  const id = +idParam;

  const client = await serverSupabaseClient(event);

  const { data, error } = await client
    .from("groups")
    .select(
      `id,
       group_name,
       group_description`,
    )
    .eq("id", id)
    .single();

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Unable to load event ${error.message}`,
    });
  }

  return {
    id,
    name: data.group_name,
    description: data.group_description,
  };
});
