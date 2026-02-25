import { defineApiStore } from "~/composables/useApiStore";

export const useEventStore = defineApiStore(
  "event",
  {
    getEvent: {
      fetcher: (eventId: number) => $fetch(`/api/events/${eventId}`),
    },
    getEventMedia: {
      fetcher: (eventId: number, page: number = 1, pageSize: number = 50) =>
        $fetch(`/api/events/${eventId}/media`, {
          params: { page, pageSize },
        }),
    },
    getEventThumbnails: {
      fetcher: (eventId: number) => $fetch(`/api/events/${eventId}/thumbnails`),
    },
    getEventDetails: {
      fetcher: (eventId: number) => $fetch(`/api/events/${eventId}/details`),
    },
  },
  {},
);
