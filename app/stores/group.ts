import { defineApiStore } from "~/composables/useApiStore";

export const useGroupStore = defineApiStore(
  "group",
  {
    getGroup: {
      fetcher: async (groupId: number) => await $fetch(`/api/groups/${groupId}`),
    },
    getGroupEvents: {
      fetcher: async (groupId: number) => await $fetch(`/api/groups/${groupId}/events`),
    },
  },
  {},
);
