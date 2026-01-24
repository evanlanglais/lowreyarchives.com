import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const query = getQuery(event);
  const variantId = query.variantId as string | undefined;

  if (!variantId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing variantId parameter",
    });
  }

  const client = await serverSupabaseClient(event);

  // Look up the variant to get bucket and storage path
  const { data: variant, error: variantError } = await client
    .from("media_variants")
    .select("bucket, storage_path, mime_type")
    .eq("id", parseInt(variantId, 10))
    .single();

  if (variantError || !variant) {
    throw createError({
      statusCode: 404,
      statusMessage: "Variant not found",
    });
  }

  // Fetch the file from S3
  const s3Client = useS3Client();
  const command = new GetObjectCommand({
    Bucket: variant.bucket,
    Key: variant.storage_path,
  });

  try {
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to retrieve file",
      });
    }

    // Extract filename from storage path
    const filename = variant.storage_path.split("/").pop() || "download";

    // Set headers for download
    setHeader(event, "Content-Type", variant.mime_type || "application/octet-stream");
    setHeader(event, "Content-Disposition", `attachment; filename="${filename}"`);

    if (response.ContentLength) {
      setHeader(event, "Content-Length", response.ContentLength.toString());
    }

    // Stream the response body
    // The Body is a readable stream in Node.js environment
    return response.Body;
  } catch (error) {
    console.error("Download failed:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to download file",
    });
  }
});
