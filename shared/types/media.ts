export enum MediaType {
  Unknown = 0,
  Photo,
  Youtube,
  Video,
  BucketVideo,
  CloudflareVideo,
  BucketPhoto,
}

export enum MediaStatus {
  Pending = "pending",
  Processing = "processing",
  Ready = "ready",
  Failed = "failed",
}

export type MediaVariant = {
  id: number;
  variantType: "original" | "optimized" | "thumbnail" | string;
  bucket: string;
  storagePath: string;
  url?: string; // Presigned URL (populated by API)
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type MediaWrapper = {
  id: number;
  description: string | null;
  status: MediaStatus;

  // Whether this media should be played with a video player
  isVideo: boolean;

  // Primary URLs (ready to use by frontend)
  url: string; // Optimized/playback URL
  thumbnailUrl: string | null; // Thumbnail URL (for grid display)

  // All available variants (for downloads, etc.)
  variants: MediaVariant[];
};

export type PaginatedMediaResponse = {
  items: MediaWrapper[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ThumbnailsResponse = {
  thumbnails: string[];
  hasProcessing: boolean;
  processingCount: number;
};
