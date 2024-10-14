import { serverSupabaseUser } from "#supabase/server";
import useS3Client from "~/server/utils/use-s3-client";
import generateSafeFilename from "~/server/utils/generate-safe-filename";
const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(
  async (event): Promise<{ uploadId: string; key: string }> => {
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
      Bucket: runtimeConfig.minioBucket,
      Key: key,
      ContentType: fileType,
    };

    try {
      const data = await useS3Client().createMultipartUpload(params);

      if (data.UploadId === undefined) {
        throw createError({
          statusCode: 500,
          statusMessage: "No uploadId found",
        });
      }

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
  },
);
