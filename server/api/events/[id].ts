import { DateTime } from "luxon";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";
import { EventWrapper } from "~/types/event";
import { mediaWrapperFromDatabaseMediaRow } from "~/server/utils/conversions";

export default defineEventHandler(async (event): Promise<EventWrapper> => {
  const idParam = getRouterParam(event, "id");

  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Event ID",
    });
  }

  const id = +idParam;

  const client = await serverSupabaseClient(event);

  const { data, error } = await client
    .from("events")
    .select(
      `id,
       title,
       description,
       start_date,
       end_date`,
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
    title: data.title,
    description: data.description,
    start_date: data.start_date,
    end_date: data.end_date,
    image: null,
  };
});
