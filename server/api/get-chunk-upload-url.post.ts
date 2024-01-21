import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverSupabaseUser } from "#supabase/server";
import useS3Client from "~/server/utils/use-s3-client";

export default defineEventHandler(async (event) => {
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
    Bucket: "videoarchive1",
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
});
