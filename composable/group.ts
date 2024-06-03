export const useGroupInfoCacheKey = (groupId: string): string => {
  return `group-${groupId}-info`;
};

export const useGroupEventsCacheKey = (groupId: string): string => {
  return `group-${groupId}-events`;
};
