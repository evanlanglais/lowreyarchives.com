import type { UserProfile } from "#shared/types/user";

export type EventWrapper = {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
};

export type EventDetailsResponse = {
  tags: string[];
  groups: Array<{ id: number; group_name: string }>;
  taggedUsers: UserProfile[];
  sharedUsers: UserProfile[];
};
