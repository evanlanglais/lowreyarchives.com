export const useMediaUrlCacheKey = (mediaId: string): string => {
  return `media-${mediaId}-url`;
};
