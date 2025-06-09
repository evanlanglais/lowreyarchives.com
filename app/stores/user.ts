import { defineApiStore } from "~/composables/useApiStore";

export const useUserStore = defineApiStore(
  "user",
  {
    /** e.g. GET /api/users/:id/groups */
    getUserGroups: {
      fetcher: (userId: string) => $fetch(`/api/users/${userId}/groups`),
    },
  },
  { ttlMs: 5 * 60 * 1000, debounceMs: 250 },
);
