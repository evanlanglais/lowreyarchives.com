import type { H3Event } from "h3";
import type { Database, Tables } from "#shared/types/database.types";
import type { MediaWrapper, MediaVariant } from "#shared/types/media";
import { MediaStatus, MediaType } from "#shared/types/media";
import { serverSupabaseClient } from "#supabase/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Type for media_variants row from database
type MediaVariantRow = {
  id: number;
  media_id: number;
  variant_type: string;
  bucket: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
};

// Generate a presigned URL for an S3 object
export async function generatePresignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const s3Client = useS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Transform database variant rows to MediaVariant with presigned URLs
export async function transformVariantsWithUrls(
  variantRows: MediaVariantRow[],
  cacheLength: number,
): Promise<MediaVariant[]> {
  return Promise.all(
    variantRows.map(async (v): Promise<MediaVariant> => ({
      id: v.id,
      variantType: v.variant_type,
      bucket: v.bucket,
      storagePath: v.storage_path,
      url: await generatePresignedUrl(v.bucket, v.storage_path, cacheLength),
      fileSize: v.file_size ?? undefined,
      mimeType: v.mime_type ?? undefined,
      width: v.width ?? undefined,
      height: v.height ?? undefined,
      durationSeconds: v.duration_seconds ? Number(v.duration_seconds) : undefined,
    })),
  );
}

// Determine if a media type is a video (used internally)
function isVideoMediaType(mediaType: MediaType): boolean {
  switch (mediaType) {
    case MediaType.Video:
    case MediaType.Youtube:
    case MediaType.BucketVideo:
    case MediaType.CloudflareVideo:
      return true;
    case MediaType.Photo:
    case MediaType.BucketPhoto:
      return false;
    default:
      return false;
  }
}

export async function mediaWrapperFromDatabaseMediaRow(
  event: H3Event,
  cacheLength: number,
  mediaRow: Tables<"media">,
  variantRows?: MediaVariantRow[],
): Promise<MediaWrapper> {
  const runtimeConfig = useRuntimeConfig();

  // Transform variants if provided
  const variants = variantRows
    ? await transformVariantsWithUrls(variantRows, cacheLength)
    : [];

  // Extract primary URLs from variants
  const optimizedVariant = variants.find((v) => v.variantType === "optimized");
  const originalVariant = variants.find((v) => v.variantType === "original");
  const thumbnailVariant = variants.find((v) => v.variantType === "thumbnail");

  // Determine media type internally (not exposed to frontend)
  const mediaType = mediaTypeFromDatabaseMediaType(mediaRow.media_type);

  // Initialize the media wrapper with common fields
  // Prefer optimized, fall back to original variant, then legacy media_url
  let url = optimizedVariant?.url ?? originalVariant?.url ?? "";
  let thumbnailUrl = thumbnailVariant?.url ?? null;

  // Handle different media types - some need special URL handling
  switch (mediaType) {
    case MediaType.Youtube:
    case MediaType.Video:
    case MediaType.Photo:
      // These types store the URL directly in media_url
      // Only use media_url if no optimized variant available
      if (!url) {
        url = mediaRow.media_url;
      }
      break;
    case MediaType.BucketVideo: {
      // Legacy bucket video using Supabase storage
      // Only use this if no optimized variant available
      if (!url) {
        const supabase = await serverSupabaseClient(event);
        const { data } = await supabase.storage
          .from("video")
          .createSignedUrl(mediaRow.media_url, cacheLength);

        if (data?.signedUrl) {
          url = data.signedUrl;
        }
      }
      break;
    }
    case MediaType.BucketPhoto: {
      // Bucket photo stored in S3-compatible storage
      // Use variants if available, otherwise generate presigned URL from media_url
      if (!url) {
        url = await generatePresignedUrl(
          runtimeConfig.s3MediaBucket,
          mediaRow.media_url,
          cacheLength,
        );
      }
      break;
    }
    case MediaType.CloudflareVideo: {
      // Cloudflare Stream videos have their own URL generation
      try {
        const token = await $fetch(
          `/api/cloudflare-video-token/${mediaRow.media_url}`,
          event,
        );

        url = `https://customer-${runtimeConfig.cloudflareStreamCode}.cloudflarestream.com/${token}/manifest/video.m3u8`;
        const cfThumbnail = `https://customer-${runtimeConfig.cloudflareStreamCode}.cloudflarestream.com/${token}/thumbnails/thumbnail.jpg?time=8s`;
        // Use Cloudflare thumbnail if no variant thumbnail
        if (!thumbnailUrl) {
          thumbnailUrl = cfThumbnail;
        }
      } catch (error) {
        console.error(error);
      }
      break;
    }
    default:
      throw createError({
        statusMessage: `Unknown media type ${mediaType}`,
      });
  }

  return {
    id: mediaRow.id,
    description: mediaRow.description,
    status: (mediaRow.status as MediaStatus) ?? MediaStatus.Ready,
    isVideo: isVideoMediaType(mediaType),
    url,
    thumbnailUrl,
    variants,
  };
}

export function mediaTypeFromDatabaseMediaType(
  mediaType: Database["public"]["Enums"]["media_type"],
): MediaType {
  switch (mediaType) {
    case "youtube_url":
      return MediaType.Youtube;
    case "photo_url":
      return MediaType.Photo;
    case "video_url":
      return MediaType.Video;
    case "bucket_video":
      return MediaType.BucketVideo;
    case "cloudflare_video":
      return MediaType.CloudflareVideo;
    case "bucket_photo":
      return MediaType.BucketPhoto;
    default:
      throw new Error(`Unknown media type "${mediaType}"`);
  }
}
