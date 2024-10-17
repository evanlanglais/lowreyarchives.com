import { serverSupabaseUser } from "#supabase/server";
import useS3Client from "~/server/utils/use-s3-client";
const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(async (event): Promise<void> => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 400,
    });
  }

  const body = await readBody(event);

  const uploadId = body.uploadId;
  const key = body.key;

  const params = {
    Bucket: runtimeConfig.minioBucket,
    Key: key,
    UploadId: uploadId,
  };

  try {
    await useS3Client().abortMultipartUpload(params);
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
    });
  }
});
