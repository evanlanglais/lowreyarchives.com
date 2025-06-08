export const useGroupInfoCacheKey = (groupId: string): string => {
    return `group-${groupId}-info`;
}

export const useGroupEventsCacheKey = (groupId: string): string => {
    return `group-${groupId}-events`;
}

export const useEventInfoCacheKey = (eventId: string): string => {
    return `event-${eventId}-info`;
}

export const useEventMediaCacheKey = (eventId: string): string => {
    return `event-${eventId}-media`;
}

export const useEventThumbnailsCacheKey = (eventId: string): string => {
    return `event-${eventId}-thumbnails`;
}

export const useMediaUrlCacheKey = (mediaId: string): string => {
    return `media-${mediaId}-url`;
}

export const useUserGroupsCacheKey = (userId: string): string => {
    return `user-${userId}-groups`;
}
