import { H3Event } from "h3";
import { Database, Tables } from "~/types/supabase";
import { MediaType, MediaWrapper } from "~/types/media";
import { serverSupabaseClient } from "#supabase/server";

export async function mediaWrapperFromDatabaseMediaRow(
  event: H3Event,
  cacheLength: number,
  mediaRow: Tables<"media">,
): Promise<MediaWrapper> {
  const runtimeConfig = useRuntimeConfig();
  const media: MediaWrapper = {
    id: mediaRow.id,
    description: mediaRow.description,
    url: "",
    type: mediaTypeFromDatabaseMediaType(mediaRow.media_type),
    image: null,
  };

  switch (media.type) {
    case MediaType.Youtube:
    case MediaType.Video:
    case MediaType.Photo:
      media.url = mediaRow.media_url;
      break;
    case MediaType.BucketVideo: {
      const supabase = await serverSupabaseClient(event);
      const { data } = await supabase.storage
        .from("video")
        .createSignedUrl(mediaRow.media_url, cacheLength);

      media.url = data?.signedUrl;
      break;
    }
    case MediaType.CloudflareVideo: {
      try {
        const token = await $fetch(
          `/api/cloudflare-video-token/${mediaRow.media_url}`,
          event,
        );

        media.url = `https://customer-${runtimeConfig.cloudflareStreamCode}.cloudflarestream.com/${token}/manifest/video.m3u8`;
        media.image = `https://customer-${runtimeConfig.cloudflareStreamCode}.cloudflarestream.com/${token}/thumbnails/thumbnail.jpg`;
      } catch (error) {
        console.error(error);
      }

      break;
    }
    default:
      throw createError({
        statusMessage: `Unknown media type ${media.type}`,
      });
  }

  return media;
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
    default:
      throw new Error(`Unknown media type "${mediaType}"`);
  }
}
