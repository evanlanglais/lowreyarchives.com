import { defineApiStore } from "~/composables/useApiStore";

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
            }
          }),
      },
  },
  { ttlMs: 5 * 60 * 1000 },
);
