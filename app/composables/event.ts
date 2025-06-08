import { DateTime } from "luxon";
import type { EventWrapper } from "#shared/types/event";

export const useEventDateString = (event: EventWrapper): string => {
  const startDate = DateTime.fromISO(event.start_date);
  const endDate = DateTime.fromISO(event.end_date);

  let returnString = startDate.toLocaleString(DateTime.DATE_MED);

  if (!startDate.equals(endDate)) {
    returnString += ` - ${endDate.toLocaleString(DateTime.DATE_MED)}`;
  }

  return returnString;
};
