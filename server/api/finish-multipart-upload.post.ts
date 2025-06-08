import { serverSupabaseUser } from "#supabase/server";
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
  const parts = body.parts;
  const key = body.key;

  const params = {
    Bucket: runtimeConfig.minioBucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  try {
    await useS3Client().completeMultipartUpload(params);
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
    });
  }
});
