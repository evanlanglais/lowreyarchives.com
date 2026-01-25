export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type GroupWithMembers = {
  id: number;
  name: string;
  members: UserProfile[];
};
