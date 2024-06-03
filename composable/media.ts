import { MediaType, type MediaWrapper } from "~/types/media";

export const useMediaUrlCacheKey = (mediaId: string): string => {
  return `media-${mediaId}-url`;
};

export const useMediaUrlFetch = async (media: MediaWrapper) => {
  const cacheKey = useMediaUrlCacheKey(media.id.toString());
  const cacheLength = 3600;

  const { data } = await useAsyncData(cacheKey, async () => {
    // First determine if we have a valid cached value
    const { value, addToCache } = await useDataCache<string>(cacheKey);
    if (value) {
      console.log(`cache hit ${cacheKey}`);
      return value;
    }

    console.log(`cache miss ${cacheKey}`);

    // If we don't have a cached value, fetch and cache
    let mediaUrl = null;
    switch (media.type) {
      case MediaType.Youtube:
      case MediaType.Video:
      case MediaType.Photo:
        mediaUrl = media.url;
        break;
      case MediaType.BucketVideo: {
        const supabase = useSupabaseClient();
        const { data } = await supabase.storage
          .from("video")
          .createSignedUrl(media.url, cacheLength);

        mediaUrl = data?.signedUrl;
        break;
      }
      default:
        throw createError({
          statusMessage: `Unknown media type ${media.type}`,
        });
    }

    if (!mediaUrl) {
      throw createError({
        statusMessage: `Unable to determine media ${media.id} url!`,
        statusCode: 404,
      });
    }

    await addToCache(mediaUrl, [], cacheLength);
    return mediaUrl;
  });

  return { data };
};
