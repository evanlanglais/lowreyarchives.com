import { defineApiStore } from "~/composables/useApiStore";

export const useEventStore = defineApiStore(
  "event",
  {
    getEvent: {
      fetcher: (eventId: string) => $fetch(`/api/events/${eventId}`),
    },
    getEventMedia: {
      fetcher: (eventId: string) => $fetch(`/api/events/${eventId}/media`),
    },
  },
  { ttlMs: 5 * 60 * 1000, debounceMs: 250 },
);
