import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverSupabaseUser } from "#supabase/server";
const runtimeConfig = useRuntimeConfig();

export default defineEventHandler(
  async (event): Promise<{ presignedUrl: string }> => {
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({
        statusCode: 400,
      });
    }

    const body = await readBody(event);

    const fileType = body.fileType;
    const uploadId = body.uploadId;
    const partNumber = body.partNumber;
    const key = body.key;

    const params = {
      Bucket: runtimeConfig.s3DmzBucket,
      Key: key,
      ContentType: fileType,
      UploadId: uploadId,
      PartNumber: partNumber,
    };

    try {
      const presignedUrl = await getSignedUrl(
        useS3Client(),
        new UploadPartCommand(params),
      );
      return {
        presignedUrl,
      };
    } catch (error) {
      console.error(error);
      throw createError({
        statusCode: 500,
      });
    }
  },
);
