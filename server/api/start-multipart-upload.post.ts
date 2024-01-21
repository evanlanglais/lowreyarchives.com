import { serverSupabaseUser } from "#supabase/server";
import useS3Client from "~/server/utils/use-s3-client";
import generateSafeFilename from "~/server/utils/generate-safe-filename";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 400,
    });
  }

  const body = await readBody(event);

  const fileName = body.fileName;
  const fileType = body.fileType;

  const key = `ingest/${generateSafeFilename(user.id, fileName)}`;

  const params = {
    Bucket: "videoarchive1",
    Key: key,
    ContentType: fileType,
  };

  try {
    const data = await useS3Client().createMultipartUpload(params);

    return {
      uploadId: data.UploadId,
      key,
    };
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
    });
  }
});
