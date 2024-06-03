export const useUserGroupsCacheKey = (userId: string): string => {
  return `user-${userId}-groups`;
};
