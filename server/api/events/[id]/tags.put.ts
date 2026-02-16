import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { useEventDetailsCacheKey } from "#shared/utils/cacheKeys";
import { removeKeys } from "~~/server/utils/cache-invalidation";

type UpdateTagsRequest = {
  tags: string[];
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

  const body = await readBody<UpdateTagsRequest>(event);

  if (!Array.isArray(body.tags)) {
    throw createError({ statusCode: 400, statusMessage: "tags must be an array" });
  }

  // Trim, deduplicate, filter empty strings
  const tags = [...new Set(body.tags.map((t) => t.trim()).filter(Boolean))];

  const client = await serverSupabaseClient(event);

  const { data, error } = await client
    .from("events")
    .update({ tags })
    .eq("id", id)
    .select("tags")
    .single();

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update tags: ${error.message}`,
    });
  }

  await removeKeys([useEventDetailsCacheKey(id.toString())]);

  return { tags: data.tags };
});
