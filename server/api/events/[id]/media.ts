import { DateTime } from "luxon";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";
import { EventWrapper } from "~/types/event";
import { mediaWrapperFromDatabaseMediaRow } from "~/server/utils/conversions";
import { MediaWrapper } from "~/types/media";

export default defineEventHandler(
  async (event): Promise<Array<MediaWrapper>> => {
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
      .from("event-media")
      .select(`...media (*)`)
      .eq("event_id", id)
      .returns<Array<Tables<"media">>>();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Unable to load event ${error.message}`,
      });
    }

    return data.map((mediaRow) => mediaWrapperFromDatabaseMediaRow(mediaRow));
  },
);
