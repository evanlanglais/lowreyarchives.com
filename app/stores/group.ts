import { defineApiStore } from "~/composables/useApiStore";

export const useGroupStore = defineApiStore(
  "group",
  {
    getGroup: {
      fetcher: (groupId: string) => $fetch(`/api/groups/${groupId}`),
    },
    getGroupEvents: {
      fetcher: (groupId: string) => $fetch(`/api/groups/${groupId}/events`),
    },
  },
  { ttlMs: 5 * 60 * 1000, debounceMs: 250 },
);
