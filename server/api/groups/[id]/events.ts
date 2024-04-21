import { DateTime } from "luxon";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { Database, Tables } from "~/types/supabase";
import { EventWrapper } from "~/types/event";
import { mediaWrapperFromDatabaseMediaRow } from "~/server/utils/conversions";

export default defineEventHandler(
  async (event): Promise<Array<Tables<"events">>> => {
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
      .from("group-events")
      .select(`...events (*)`)
      .eq("group_id", id)
      .returns<Array<Tables<"events">>>();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Unable to load group events`,
      });
    }

    return data;
  },
);
