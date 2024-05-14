import { DateTime } from "luxon";
import type { MediaWrapper } from "~/types/media";

export interface EventWrapper {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  start_date: string;
  end_date: string;
}
