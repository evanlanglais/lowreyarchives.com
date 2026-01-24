import { defineApiStore } from "~/composables/useApiStore";
import type { UserProfile, GroupWithMembers } from "#shared/types/user";

export const useUserStore = defineApiStore(
  "user",
  {
    getUserGroups: {
      fetcher: (userId: string) => $fetch(`/api/users/${userId}/groups`),
    },
    getUserEvents: {
      fetcher: (userId: string, page: number, pageSize: number, filters?: Record<string, any>) =>
        $fetch(`/api/users/${userId}/events`, {
          params: {
            page,
            pageSize,
            ...filters,
          },
        }),
    },
    searchUsers: {
      fetcher: (query: string): Promise<UserProfile[]> =>
        $fetch(`/api/users/search`, {
          params: { q: query },
        }),
    },
    getGroupMembers: {
      fetcher: (): Promise<{ groups: GroupWithMembers[] }> =>
        $fetch(`/api/users/me/group-members`),
    },
  },
  { ttlMs: 5 * 60 * 1000 },
);
