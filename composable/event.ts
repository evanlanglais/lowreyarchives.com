import { DateTime } from "luxon";
import type { EventWrapper } from "~/types/event";

export const useEventInfoCacheKey = (eventId: string): string => {
  return `event-${eventId}-info`;
};

export const useEventMediaCacheKey = (eventId: string): string => {
  return `event-${eventId}-media`;
};

export const useEventThumbnailsCacheKey = (eventId: string): string => {
  return `event-${eventId}-thumbnails`;
};

export const useEventDateString = (event: EventWrapper): string => {
  const startDate = DateTime.fromISO(event.start_date);
  const endDate = DateTime.fromISO(event.end_date);

  let returnString = startDate.toLocaleString(DateTime.DATE_MED);

  if (!startDate.equals(endDate)) {
    returnString += ` - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
  }

  return returnString;
};
