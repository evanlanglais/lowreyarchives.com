export enum MediaType {
  Unknown = 0,
  Photo,
  Youtube,
  Video,
}

export interface MediaWrapper {
  id: number;
  description: string | null;
  image: string | null;
  url: string;
  type: MediaType;
}
