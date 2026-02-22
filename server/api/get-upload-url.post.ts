import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverSupabaseUser } from "#supabase/server";
const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(
  async (event): Promise<{ presignedUrl: string; key: string }> => {
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const body = await readBody(event);

    const fileName = body.fileName;
    const fileType = body.fileType;

    const key = `ingest/${generateSafeFilename(user.sub, fileName)}`;

    const params = {
      Bucket: runtimeConfig.s3DmzBucket,
      Key: key,
      ContentType: fileType,
    };

    try {
      const presignedUrl = await getSignedUrl(
        useS3Client(),
        new PutObjectCommand(params),
      );
      return {
        presignedUrl,
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
