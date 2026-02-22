import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { invalidateEventMediaCache } from "~~/server/utils/cache-invalidation";

type RegisterUploadResponse = {
  mediaId?: number;
  success: boolean;
};

export default defineEventHandler(async (event): Promise<RegisterUploadResponse> => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody(event);

  const key = body.key as string;
  const eventId = body.eventId as number | undefined;
  const mediaType = body.mediaType as "video" | "photo" | undefined;
  const description = body.description as string | undefined;

  if (!eventId || !mediaType || !key) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: key, eventId, mediaType",
    });
  }

  try {
    const client = await serverSupabaseClient(event);

    const dbMediaType = mediaType === "video" ? "bucket_video" : "bucket_photo";

    const { data: mediaRecord, error: mediaError } = await client
      .from("media")
      .insert({
        media_url: key,
        media_type: dbMediaType,
        description: description || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (mediaError) {
      console.error("Failed to create media record:", mediaError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create media record",
      });
    }

    const { error: junctionError } = await client
      .from("event-media")
      .insert({
        event_id: eventId,
        media_id: mediaRecord.id,
      });

    if (junctionError) {
      console.error("Failed to link media to event:", junctionError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to link media to event",
      });
    }

    await invalidateEventMediaCache(eventId);

    return { mediaId: mediaRecord.id, success: true };
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to register upload",
    });
  }
});
