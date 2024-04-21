import { Database, Tables } from "~/types/supabase";
import { MediaType, MediaWrapper } from "~/types/media";

export function mediaWrapperFromDatabaseMediaRow(
  mediaRow: Tables<"media">,
): MediaWrapper {
  return {
    id: mediaRow.id,
    description: mediaRow.description,
    url: mediaRow.media_url,
    type: mediaTypeFromDatabaseMediaType(mediaRow.media_type),
    image: null,
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
    default:
      throw new Error(`Unknown media type "${mediaType}"`);
  }
}
