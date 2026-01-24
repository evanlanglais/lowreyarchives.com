import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { useEventMediaCacheKey } from "#shared/utils/cacheKeys";

const runtimeConfig = useRuntimeConfig();

type FinishMultipartUploadResponse = {
  mediaId?: number;
  success: boolean;
};

export default defineEventHandler(async (event): Promise<FinishMultipartUploadResponse> => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody(event);

  const uploadId = body.uploadId;
  const parts = body.parts;
  const key = body.key;
  const eventId = body.eventId as number | undefined;
  const mediaType = body.mediaType as "video" | "photo" | undefined;
  const description = body.description as string | undefined;

  const params = {
    Bucket: runtimeConfig.s3DmzBucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  try {
    await useS3Client().completeMultipartUpload(params);

    // If eventId is provided, create media record and link to event
    if (eventId && mediaType) {
      const client = await serverSupabaseClient(event);

      // Determine database media type (bucket_video for videos, bucket_photo for photos)
      const dbMediaType = mediaType === "video" ? "bucket_video" : "bucket_photo";

      // Insert media record with status='pending'
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

      // Insert event-media junction record
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

      // Invalidate the event media cache so the new media appears immediately
      const cacheKey = useEventMediaCacheKey(eventId.toString());
      try {
        // Access nuxt-multi-cache storage from event context
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const multiCache = (event.context as any)?.multiCache?.data;
        if (multiCache?.storage) {
          await multiCache.storage.removeItem(cacheKey);
        }
      } catch (e) {
        console.warn("Failed to invalidate cache:", e);
      }

      return { mediaId: mediaRecord.id, success: true };
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to complete upload",
    });
  }
});
