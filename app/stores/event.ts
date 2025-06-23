import { defineApiStore } from "~/composables/useApiStore";

export const useEventStore = defineApiStore(
  "event",
  {
    getEvent: {
      fetcher: (eventId: number) => $fetch(`/api/events/${eventId}`),
    },
    getEventMedia: {
      fetcher: (eventId: number) => $fetch(`/api/events/${eventId}/media`),
    },
  },
  { ttlMs: 5 * 60 * 1000 },
);
