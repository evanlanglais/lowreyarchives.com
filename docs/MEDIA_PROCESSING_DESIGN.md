# Media Processing System Design

> **Document Purpose**: This document describes the architecture, data flow, and integration points for the LowreyArchives media processing system. It serves as a reference for developers and AI tools working on the system.
>
> **Last Updated**: January 2026
>
> **Related Projects**:
> - `lowreyarchives.com` - Nuxt 4 frontend/backend (this repo)
> - `lowreyarchives-media` - Go media processor (`~/wd/lowreyarchives-media`)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Components](#3-components)
4. [Data Flow](#4-data-flow)
5. [API Specifications](#5-api-specifications)
6. [Database Schema](#6-database-schema)
7. [S3 Storage Structure](#7-s3-storage-structure)
8. [Media Variants](#8-media-variants)
9. [Processing Pipeline](#9-processing-pipeline)
10. [Error Handling & Retry Logic](#10-error-handling--retry-logic)
11. [Configuration](#11-configuration)
12. [Future Considerations](#12-future-considerations)
13. [Media Variants Storage Design](#13-media-variants-storage-design)

---

## 1. System Overview

The media processing system handles uploading, processing, and serving family media (photos and videos) with the following goals:

- **Preserve originals**: Archive original uploads for future reference
- **Optimize for web**: Generate web-optimized variants for fast playback
- **Generate thumbnails**: Create preview images for grid displays
- **Track processing status**: Provide real-time feedback on media processing state

### Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Nuxt 4 / Vue 3 | User interface, upload wizard |
| Backend API | Nitro (Nuxt server) | Upload orchestration, presigned URLs |
| Media Processor | Go application | Video/image transcoding, thumbnail generation |
| Object Storage | Garage (S3-compatible) | File storage (ingest, archive, optimized) |
| Database | Supabase PostgreSQL | Media metadata, processing job queue |
| Video Encoding | FFmpeg | Video transcoding, thumbnail extraction |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Upload Wizard (MediaUploader.vue)                 │   │
│  │  • Select files → Queue → Review → Upload                           │   │
│  │  • 20MB chunk uploads with retry logic                              │   │
│  │  • Real-time progress tracking                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NUXT APPLICATION (Nitro)                            │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ /api/start-      │  │ /api/get-chunk-  │  │ /api/finish-multipart-   │  │
│  │ multipart-upload │  │ upload-url       │  │ upload                   │  │
│  │                  │  │                  │  │                          │  │
│  │ Creates upload   │  │ Returns          │  │ • Completes S3 upload    │  │
│  │ session in S3    │  │ presigned URL    │  │ • Creates media record   │  │
│  │                  │  │ for chunk        │  │ • Links to event         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
│           │                     │                         │                 │
└───────────┼─────────────────────┼─────────────────────────┼─────────────────┘
            │                     │                         │
            ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GARAGE S3 (Object Storage)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        fa-dmz (Ingest Bucket)                        │   │
│  │                                                                      │   │
│  │  ingest/                                                             │   │
│  │    ├── {uuid}_{timestamp}_{uid}.mp4     ← Uploaded files land here  │   │
│  │    ├── {uuid}_{timestamp}_{uid}.jpg                                 │   │
│  │    └── ...                                                          │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                      fa-media (Media Bucket)                         │   │
│  │                                                                      │   │
│  │  archive/                        ← Original files preserved          │   │
│  │    ├── {filename}.mp4                                               │   │
│  │    └── {filename}.jpg                                               │   │
│  │                                                                      │   │
│  │  optimized/                      ← Web-optimized variants           │   │
│  │    ├── {filename}_optimized.mp4                                     │   │
│  │    └── {filename}_optimized.jpg                                     │   │
│  │                                                                      │   │
│  │  thumbnails/                     ← Preview images                    │   │
│  │    ├── {filename}_thumb.jpg                                         │   │
│  │    └── ...                                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            ▲                                               │
            │                                               │
            │ Download from ingest                          │ Upload processed
            │ Upload to archive/optimized/thumbnails        │ Delete from ingest
            │                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MEDIA PROCESSOR (Go Application)                        │
│                           ~/wd/lowreyarchives-media                          │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │   Scanner    │   │ Worker Pool  │   │   Video      │   │   Image     │  │
│  │              │   │  (4 workers) │   │  Processor   │   │  Processor  │  │
│  │ Polls DB for │   │              │   │              │   │             │  │
│  │ pending jobs │──▶│ Claims jobs  │──▶│ FFmpeg       │   │ Go stdlib   │  │
│  │ every 10s    │   │ atomically   │   │ transcode    │   │ + ImageMagick│  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └─────────────┘  │
│                                                                             │
│  HTTP Endpoints:                                                            │
│  • GET /healthz  - Liveness probe                                          │
│  • GET /readyz   - Readiness probe (DB connectivity + pending jobs)        │
│  • GET /metrics  - Prometheus metrics                                       │
└─────────────────────────────────────────────────────────────────────────────┘
            │                                               ▲
            │                                               │
            ▼                                               │
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE PostgreSQL                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           media table                                │   │
│  │  • id, media_url, media_type, status, description, created_at       │   │
│  │  • status: 'pending' → 'processing' → 'ready' | 'failed'            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      processing_jobs table                           │   │
│  │  • Job queue with atomic claiming (FOR UPDATE SKIP LOCKED)           │   │
│  │  • Tracks: ingest_path, archive_path, optimized_path, thumbnail_path│   │
│  │  • Processing metadata in JSONB (dimensions, duration, codec, etc.) │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       event-media table                              │   │
│  │  • Junction table linking media to events                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 Nuxt Application (This Repository)

**Location**: `/Users/evanlanglais/wd/lowreyarchives.com`

**Responsibilities**:
- User authentication via Supabase Auth
- Upload wizard UI with drag-and-drop file selection
- Multipart upload orchestration with chunking
- Media browsing and playback
- Real-time status display for pending/processing media

**Key Files**:
| File | Purpose |
|------|---------|
| `app/components/MediaUploader.vue` | Upload UI with progress tracking |
| `app/components/MediaGrid.vue` | Media grid with status overlays |
| `app/pages/upload/[[eventId]].vue` | Upload wizard page |
| `server/api/start-multipart-upload.post.ts` | Initiates S3 multipart upload |
| `server/api/get-chunk-upload-url.post.ts` | Returns presigned URL for chunk |
| `server/api/finish-multipart-upload.post.ts` | Completes upload, creates DB records |
| `server/api/abort-multipart-upload.post.ts` | Cancels failed uploads |
| `server/utils/s3.ts` | S3 client configuration |

### 3.2 Media Processor (Go Application)

**Location**: `~/wd/lowreyarchives-media`

**Responsibilities**:
- Poll database for pending media
- Download files from ingest bucket
- Transcode videos (FFmpeg)
- Optimize images
- Generate thumbnails
- Archive originals
- Upload processed variants
- Update database status

**Key Files**:
| File | Purpose |
|------|---------|
| `cmd/processor/main.go` | Application entry point |
| `internal/worker/worker.go` | Individual worker processing logic |
| `internal/worker/pool.go` | Worker pool management |
| `internal/processor/video.go` | FFmpeg video processing |
| `internal/processor/image.go` | Image resizing |
| `internal/db/jobs.go` | Job queue operations |
| `internal/storage/s3.go` | S3 operations |
| `internal/queue/scanner.go` | Pending media detection |

### 3.3 Garage S3 (Object Storage)

**Endpoint**: `https://garage-media-s3.lowreyarchives.com`

**Buckets**:
| Bucket | Purpose | Retention |
|--------|---------|-----------|
| `fa-dmz` | Temporary ingest storage | Deleted after processing |
| `fa-media` | Permanent media storage | Indefinite |

### 3.4 Supabase PostgreSQL

**Purpose**: Shared database for metadata and job coordination

**Key Features Used**:
- Row-level security (RLS) for access control
- `FOR UPDATE SKIP LOCKED` for atomic job claiming
- Triggers for user profile sync (planned)

---

## 4. Data Flow

### 4.1 Upload Flow (User → Ingest Bucket)

```
1. User selects files in MediaUploader
   ↓
2. For each file:
   a) POST /api/start-multipart-upload
      Request:  { fileName: "video.mp4", fileType: "video/mp4" }
      Response: { uploadId: "abc123", key: "ingest/{uuid}_{ts}_{uid}.mp4" }
   ↓
   b) For each 20MB chunk:
      POST /api/get-chunk-upload-url
      Request:  { key, uploadId, partNumber, fileType }
      Response: { presignedUrl: "https://..." }

      PUT {presignedUrl} with chunk data (up to 5 retries)
      Response: ETag header
   ↓
   c) POST /api/finish-multipart-upload
      Request:  { key, uploadId, parts: [{ETag, PartNumber}...], eventId, mediaType }
      Response: { mediaId: 123, success: true }

      Side effects:
      - Completes S3 multipart upload
      - INSERT INTO media (media_url, media_type, status='pending')
      - INSERT INTO event-media (event_id, media_id)
```

### 4.2 Processing Flow (Ingest → Archive/Optimized)

```
1. Scanner polls every 10 seconds
   SELECT FROM media WHERE media_url LIKE 'ingest/%' AND status = 'pending'
   ↓
2. For each pending media:
   INSERT INTO processing_jobs (media_id, ingest_path, status='pending', job_type)
   ↓
3. Worker claims job atomically:
   UPDATE processing_jobs SET status='processing', worker_id=X
   WHERE status='pending' ORDER BY created_at LIMIT 1
   FOR UPDATE SKIP LOCKED
   ↓
4. Worker downloads file:
   S3 GET fa-dmz/{ingest_path} → /tmp/media-processor/{worker-id}/job-{id}/
   ↓
5. Worker processes file:
   Video: FFmpeg transcode → optimized.mp4 + thumbnail.jpg
   Image: Resize → optimized.jpg + thumbnail.jpg
   ↓
6. Worker uploads results:
   PUT fa-media/archive/{original_filename}
   PUT fa-media/optimized/{filename}_optimized.{ext}
   PUT fa-media/thumbnails/{filename}_thumb.jpg
   ↓
7. Worker updates database:
   UPDATE processing_jobs SET
     status='completed',
     archive_path='archive/...',
     optimized_path='optimized/...',
     thumbnail_path='thumbnails/...'

   UPDATE media SET
     media_url='optimized/...',
     status='ready'
   ↓
8. Worker cleanup:
   DELETE fa-dmz/{ingest_path}
   rm -rf /tmp/media-processor/{worker-id}/job-{id}/
```

### 4.3 Playback Flow (User → Optimized Media)

```
1. User navigates to event page
   ↓
2. GET /api/events/{id}/media
   Returns: MediaWrapper[] with status and URLs
   ↓
3. For each media item:
   - status='ready': Display thumbnail, enable playback
   - status='pending': Show clock icon overlay
   - status='processing': Show spinning icon overlay
   - status='failed': Show error icon overlay
   ↓
4. On media click (if ready):
   - Photos: Generate presigned URL for fa-media/optimized/...
   - Videos: Generate presigned URL or stream via player
```

---

## 5. API Specifications

### 5.1 Nuxt Backend APIs

#### POST `/api/start-multipart-upload`

Initiates a multipart upload session.

**Auth**: Required (Supabase user)

**Request**:
```typescript
{
  fileName: string;  // Original filename
  fileType: string;  // MIME type (e.g., "video/mp4")
}
```

**Response**:
```typescript
{
  uploadId: string;  // S3 multipart upload ID
  key: string;       // S3 object key (e.g., "ingest/{uuid}_{ts}_{uid}.mp4")
}
```

#### POST `/api/get-chunk-upload-url`

Returns a presigned URL for uploading a chunk.

**Auth**: Required (Supabase user)

**Request**:
```typescript
{
  key: string;        // S3 object key from start-multipart-upload
  uploadId: string;   // S3 multipart upload ID
  partNumber: number; // 1-indexed chunk number
  fileType: string;   // MIME type
}
```

**Response**:
```typescript
{
  presignedUrl: string;  // Presigned PUT URL (valid for 1 hour)
}
```

#### POST `/api/finish-multipart-upload`

Completes the upload and creates database records.

**Auth**: Required (Supabase user)

**Request**:
```typescript
{
  key: string;
  uploadId: string;
  parts: Array<{
    ETag: string;
    PartNumber: number;
  }>;
  eventId?: number;              // Event to link media to
  mediaType?: "video" | "photo"; // Media classification
  description?: string;          // Optional description
}
```

**Response**:
```typescript
{
  mediaId?: number;  // Created media record ID
  success: boolean;
}
```

#### POST `/api/abort-multipart-upload`

Cancels a failed multipart upload.

**Auth**: Required (Supabase user)

**Request**:
```typescript
{
  key: string;
  uploadId: string;
}
```

### 5.2 Media Processor HTTP APIs

#### GET `/healthz`

Kubernetes liveness probe.

**Response**: `200 OK` with body `"ok"`

#### GET `/readyz`

Kubernetes readiness probe. Checks database connectivity.

**Response**:
```typescript
{
  status: "ready" | "not_ready";
  database: "connected" | "error";
  pending_jobs: number;
}
```

#### GET `/metrics`

Prometheus-compatible metrics endpoint.

**Response**:
```
# HELP media_processor_pending_jobs Number of pending processing jobs
# TYPE media_processor_pending_jobs gauge
media_processor_pending_jobs 5
```

---

## 6. Database Schema

### 6.1 media table

```sql
CREATE TABLE media (
  id BIGSERIAL PRIMARY KEY,
  media_url TEXT NOT NULL,
  media_type media_type NOT NULL,  -- ENUM
  description TEXT,
  status VARCHAR(20) DEFAULT 'ready'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_media_status ON media(status);

-- ENUM type
CREATE TYPE media_type AS ENUM (
  'youtube_url',
  'video_url',
  'photo_url',
  'bucket_video',
  'cloudflare_video'
);
```

**Field Descriptions**:
| Field | Description |
|-------|-------------|
| `media_url` | S3 path. Initially `ingest/{filename}`, becomes `optimized/{filename}_optimized.ext` after processing |
| `media_type` | Type classification for playback handling |
| `status` | Processing state: pending → processing → ready/failed |
| `created_by` | UUID of uploading user |

### 6.2 processing_jobs table

```sql
CREATE TABLE processing_jobs (
  id BIGSERIAL PRIMARY KEY,
  media_id BIGINT NOT NULL REFERENCES media(id),
  event_id BIGINT REFERENCES events(id),
  job_type VARCHAR(50) NOT NULL
    CHECK (job_type IN ('video', 'photo')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),

  -- S3 paths
  ingest_path TEXT NOT NULL,
  archive_path TEXT,
  optimized_path TEXT,
  thumbnail_path TEXT,

  -- Execution tracking
  retry_count INT DEFAULT 0,
  error_message TEXT,
  worker_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Processing metadata (dimensions, duration, codec, etc.)
  processing_details JSONB
);

CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_media_id ON processing_jobs(media_id);
CREATE INDEX idx_processing_jobs_worker ON processing_jobs(worker_id);
CREATE INDEX idx_processing_jobs_completed ON processing_jobs(completed_at);
```

**Field Descriptions**:
| Field | Description |
|-------|-------------|
| `ingest_path` | Original upload path in fa-dmz bucket |
| `archive_path` | Path to archived original in fa-media/archive/ |
| `optimized_path` | Path to processed file in fa-media/optimized/ |
| `thumbnail_path` | Path to thumbnail in fa-media/thumbnails/ |
| `worker_id` | ID of worker currently processing (for debugging) |
| `processing_details` | JSONB with video/image metadata |

**processing_details JSONB Structure**:
```typescript
// For videos
{
  width: number;
  height: number;
  duration: number;      // seconds
  codec: string;
  bitrate: number;
  fps: number;
  audio_codec?: string;
  audio_bitrate?: number;
}

// For images
{
  width: number;
  height: number;
  format: string;
  original_size: number; // bytes
  optimized_size: number;
}
```

### 6.3 event-media junction table

```sql
CREATE TABLE "event-media" (
  event_id BIGINT NOT NULL REFERENCES events(id),
  media_id BIGINT NOT NULL REFERENCES media(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, media_id)
);
```

---

## 7. S3 Storage Structure

### 7.1 Bucket: fa-dmz (Ingest)

**Purpose**: Temporary storage for uploads before processing

**Structure**:
```
fa-dmz/
└── ingest/
    ├── {uuid}_{timestamp}_{uid}.mp4
    ├── {uuid}_{timestamp}_{uid}.jpg
    └── ...
```

**Lifecycle**: Files deleted after successful processing

**Access**: Nuxt app (write via presigned URLs), Media processor (read/delete)

### 7.2 Bucket: fa-media (Permanent Storage)

**Purpose**: Long-term storage for all media variants

**Structure**:
```
fa-media/
├── archive/                    # Original files (untouched)
│   ├── {uuid}_{ts}_{uid}.mp4
│   ├── {uuid}_{ts}_{uid}.jpg
│   └── ...
│
├── optimized/                  # Web-optimized variants
│   ├── {uuid}_{ts}_{uid}_optimized.mp4
│   ├── {uuid}_{ts}_{uid}_optimized.jpg
│   └── ...
│
└── thumbnails/                 # Preview images
    ├── {uuid}_{ts}_{uid}_thumb.jpg
    └── ...
```

**Access**:
- Media processor (write)
- Nuxt app (read via presigned URLs)

### 7.3 File Naming Convention

**Pattern**: `{uuid}_{timestamp}_{user-id}{extension}`

**Example**: `a1b2c3d4-e5f6-4789_1705600000000_user-abc123.mp4`

| Component | Description |
|-----------|-------------|
| `uuid` | Unique identifier (prevents collisions) |
| `timestamp` | Upload time in milliseconds |
| `user-id` | Uploading user's ID (audit trail) |
| `extension` | Original file extension |

---

## 8. Media Variants

### 8.1 Video Processing

**Input Formats**: MP4, MOV, AVI, MKV, WebM, M4V, WMV, FLV, MPEG, MPG, 3GP

**Output Specification**:

| Variant | Format | Codec | Resolution | Quality | Suffix |
|---------|--------|-------|------------|---------|--------|
| Archive | Original | Original | Original | Original | (none) |
| Optimized | MP4 | H.264 | ≤1920x1080 | CRF 23 | `_optimized.mp4` |
| Thumbnail | JPEG | - | 640x360 | Q=80 | `_thumb.jpg` |

**FFmpeg Command** (simplified):
```bash
ffmpeg -i input.mov \
  -c:v libx264 -preset medium -crf 23 \
  -vf "scale='min(1920,iw)':min'(1080,ih)':force_original_aspect_ratio=decrease" \
  -c:a aac -b:a 128k \
  output_optimized.mp4
```

**Thumbnail Extraction**:
- Extracted at 10% of video duration (or 1s for videos < 10s)
- Scaled to 640x360 maintaining aspect ratio

### 8.2 Image Processing

**Input Formats**: JPG, PNG, GIF, WebP, BMP, TIFF, HEIC, HEIF, RAW, CR2, NEF

**Output Specification**:

| Variant | Format | Resolution | Quality | Suffix |
|---------|--------|------------|---------|--------|
| Archive | Original | Original | Original | (none) |
| Optimized | JPEG | ≤2048x2048 | Q=85 | `_optimized.jpg` |
| Thumbnail | JPEG | 400x400 | Q=80 | `_thumb.jpg` |

**Processing Notes**:
- EXIF orientation is auto-corrected
- Transparency (PNG) is flattened to white background
- HEIC/RAW formats use ImageMagick fallback

---

## 9. Processing Pipeline

### 9.1 Job States

```
                    ┌─────────────────┐
                    │                 │
          ┌─────────▶    pending     │
          │         │                 │
          │         └────────┬────────┘
          │                  │
          │         Worker claims job
          │                  │
          │         ┌────────▼────────┐
          │         │                 │
    Stale job       │   processing    │
    detection       │                 │
    (>1 hour)       └────────┬────────┘
          │                  │
          │         ┌────────┴────────┐
          │         │                 │
          │    Success            Failure
          │         │                 │
          │   ┌─────▼─────┐    ┌─────▼─────┐
          │   │           │    │           │
          │   │ completed │    │  failed   │◀────┐
          │   │           │    │           │     │
          │   └───────────┘    └─────┬─────┘     │
          │                         │            │
          │                   retry_count < 3    │
          │                         │            │
          │                   ┌─────▼─────┐      │
          │                   │           │      │
          └───────────────────│ retrying  │──────┘
                              │           │  retry_count >= 3
                              └───────────┘
```

### 9.2 Worker Processing Steps

```go
func (w *Worker) processJob(job *ProcessingJob) error {
    // 1. Download from ingest bucket
    localPath := w.downloadFromIngest(job.IngestPath)

    // 2. Process based on job type
    var optimizedPath, thumbnailPath string
    if job.JobType == "video" {
        optimizedPath = w.videoProcessor.Process(localPath)
        thumbnailPath = w.videoProcessor.ExtractThumbnail(localPath)
    } else {
        optimizedPath = w.imageProcessor.Process(localPath)
        thumbnailPath = w.imageProcessor.GenerateThumbnail(localPath)
    }

    // 3. Archive original
    archivePath := w.storage.ArchiveOriginal(localPath, job.IngestPath)

    // 4. Upload optimized and thumbnail
    w.storage.UploadToMedia(optimizedPath, "optimized/...")
    w.storage.UploadToMedia(thumbnailPath, "thumbnails/...")

    // 5. Update database
    w.db.UpdateJobCompleted(job.ID, archivePath, optimizedPath, thumbnailPath)
    w.db.UpdateMediaReady(job.MediaID, optimizedPath)

    // 6. Cleanup
    w.storage.DeleteFromIngest(job.IngestPath)
    os.RemoveAll(localPath)

    return nil
}
```

### 9.3 Atomic Job Claiming

To prevent multiple workers from processing the same job:

```sql
-- Worker claims next available job
UPDATE processing_jobs
SET
  status = 'processing',
  worker_id = $1,
  started_at = NOW()
WHERE id = (
  SELECT id FROM processing_jobs
  WHERE status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

---

## 10. Error Handling & Retry Logic

### 10.1 Client-Side (Upload)

| Error | Handling |
|-------|----------|
| Chunk upload failure | Retry up to 5 times with exponential backoff |
| Network timeout | 60 second timeout per chunk, then retry |
| Complete upload failure | Abort multipart upload, show error to user |

### 10.2 Server-Side (Processing)

| Error | Handling |
|-------|----------|
| Download failure | Mark job as failed, increment retry_count |
| Processing failure (FFmpeg) | Mark job as failed, store error_message |
| Upload failure | Mark job as failed, retry later |
| Stale job (>1 hour processing) | Reset to 'pending' for re-processing |

**Retry Configuration**:
```env
MAX_RETRIES=3
STALE_JOB_TIMEOUT_MINUTES=60
```

### 10.3 Media Status Handling in UI

```typescript
// MediaGrid.vue status display
switch (media.status) {
  case 'pending':
    // Show clock icon, "Pending" label
    break;
  case 'processing':
    // Show spinning icon, "Processing..." label
    break;
  case 'failed':
    // Show warning icon, "Failed" label
    // Optionally show retry button
    break;
  case 'ready':
    // Show thumbnail, enable playback
    break;
}
```

---

## 11. Configuration

### 11.1 Nuxt Application

**Environment Variables** (`.env`):
```env
# S3 Configuration
S3_URL=https://garage-media-s3.lowreyarchives.com
S3_KEY=<access-key>
S3_KEY_SECRET=<secret-key>
S3_DMZ_BUCKET=fa-dmz
S3_MEDIA_BUCKET=fa-media
S3_REGION=garage

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-key>
```

**nuxt.config.ts**:
```typescript
runtimeConfig: {
  s3Url: process.env.S3_URL,
  s3Key: process.env.S3_KEY,
  s3KeySecret: process.env.S3_KEY_SECRET,
  s3DmzBucket: process.env.S3_DMZ_BUCKET || 'fa-dmz',
  s3MediaBucket: process.env.S3_MEDIA_BUCKET || 'fa-media',
  s3Region: process.env.S3_REGION || 'garage',
}
```

### 11.2 Media Processor

**Environment Variables**:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# S3 Configuration
S3_ENDPOINT=https://garage-media-s3.lowreyarchives.com
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_REGION=garage
S3_INGEST_BUCKET=fa-dmz
S3_INGEST_PATH=ingest
S3_MEDIA_BUCKET=fa-media
S3_ARCHIVE_PATH=archive

# Worker Configuration
WORKER_COUNT=4
POLL_INTERVAL_SEC=10
MAX_RETRIES=3
STALE_JOB_TIMEOUT_MINUTES=60

# Video Processing
VIDEO_CODEC=libx264
VIDEO_PRESET=medium
VIDEO_CRF=23
VIDEO_MAX_WIDTH=1920
VIDEO_MAX_HEIGHT=1080

# Image Processing
IMAGE_MAX_WIDTH=2048
IMAGE_MAX_HEIGHT=2048
IMAGE_QUALITY=85
THUMBNAIL_SIZE=400
```

---

## 12. Future Considerations

### 12.1 Planned Enhancements

1. **HLS Adaptive Streaming**
   - Generate multiple quality variants (1080p, 720p, 480p)
   - Create HLS playlist for adaptive playback
   - Code exists in processor but not integrated

2. **Thumbnail Variants**
   - Multiple sizes for different contexts (grid, detail, social)
   - WebP format support for smaller file sizes

3. **Processing Webhooks**
   - Notify Nuxt app when processing completes
   - Enable real-time UI updates without polling

4. **Bulk Processing**
   - Priority queue for large batch uploads
   - Progress tracking for bulk operations

### 12.2 Observability Improvements

1. **Distributed Tracing**
   - Track request across Nuxt → S3 → Processor → DB

2. **Enhanced Metrics**
   - Processing time histograms
   - Error rate by job type
   - Queue depth over time

3. **Alerting**
   - Failed job threshold alerts
   - Stale job alerts
   - Storage capacity warnings

### 12.3 Schema Evolution

See [Section 13: Media Variants Storage Design](#13-media-variants-storage-design) for the recommended approach.

---

## 13. Media Variants Storage Design

> **Status**: IMPLEMENTED (January 2026)
>
> This section describes the design for storing and exposing media variants (thumbnail, original, optimized, and future variants) to the frontend.
>
> **Implementation Notes**:
> - Database table `media_variants` created with RLS policies
> - Frontend `MediaWrapper` type updated with `thumbnailUrl` and `variants` array
> - `MediaGrid` uses `thumbnailUrl` for grid display
> - `MediaTheater` includes download dropdown for original/optimized variants
> - Media processor needs to be updated to insert variant records after processing

### 13.1 Problem Statement

The current design has a gap in how media variants are exposed to the frontend:

1. **Thumbnail Display**: The frontend needs thumbnail URLs to display in `MediaGrid`, but only `media.media_url` (the optimized path) is available after processing.

2. **Download Options**: Users should be able to download:
   - Original (archived) file - full quality
   - Optimized file - web-optimized
   - Future variants (HLS segments, different resolutions)

3. **Current Limitations**:
   - `media.media_url` only stores the optimized path
   - `processing_jobs` table stores paths but is a job queue, not designed for long-term reference
   - No mechanism to expose multiple variants per media item

### 13.2 Proposed Solution: media_variants Table

Create a dedicated `media_variants` table that stores all variants for each media item. This approach is:
- **Extensible**: Easy to add new variant types (HLS, WebP thumbnails, different resolutions)
- **Queryable**: Frontend can fetch all variants in a single join
- **Normalized**: Avoids adding multiple columns to the media table

#### Database Schema

```sql
-- Migration: create_media_variants_table
CREATE TABLE media_variants (
  id BIGSERIAL PRIMARY KEY,
  media_id BIGINT NOT NULL REFERENCES media(id) ON DELETE CASCADE,

  -- Variant identification
  variant_type VARCHAR(50) NOT NULL,
  -- Supported types: 'original', 'optimized', 'thumbnail', 'thumbnail_sm', 'hls_master', 'hls_1080p', 'hls_720p', etc.

  -- Storage location
  bucket VARCHAR(100) NOT NULL DEFAULT 'fa-media',
  storage_path TEXT NOT NULL,

  -- File metadata
  file_size BIGINT,
  mime_type VARCHAR(100),
  width INT,
  height INT,
  duration_seconds NUMERIC(10,2),  -- For video/audio variants

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one variant type per media
  UNIQUE(media_id, variant_type)
);

-- Indexes for common queries
CREATE INDEX idx_media_variants_media_id ON media_variants(media_id);
CREATE INDEX idx_media_variants_type ON media_variants(variant_type);

-- RLS Policy: Users can view variants for media they can access
ALTER TABLE media_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants for accessible media" ON media_variants
  FOR SELECT USING (
    media_id IN (
      SELECT em.media_id FROM "event-media" em
      JOIN "group-events" ge ON em.event_id = ge.event_id
      JOIN "group-users" gu ON ge.group_id = gu.group_id
      WHERE gu.user_id = auth.uid()
      UNION
      SELECT em.media_id FROM "event-media" em
      JOIN "user-events" ue ON em.event_id = ue.event_id
      WHERE ue.user_id = auth.uid()
    )
  );
```

#### Variant Types

| variant_type | Description | Generated By | Storage Path |
|--------------|-------------|--------------|--------------|
| `original` | Original uploaded file | Processor | `archive/{filename}` |
| `optimized` | Web-optimized version | Processor | `optimized/{filename}_optimized.{ext}` |
| `thumbnail` | Preview image (640x360) | Processor | `thumbnails/{filename}_thumb.jpg` |
| `thumbnail_sm` | Small thumbnail (200x150) | Processor (future) | `thumbnails/{filename}_thumb_sm.jpg` |
| `hls_master` | HLS master playlist | Processor (future) | `hls/{filename}/master.m3u8` |
| `hls_1080p` | HLS 1080p variant | Processor (future) | `hls/{filename}/1080p.m3u8` |
| `hls_720p` | HLS 720p variant | Processor (future) | `hls/{filename}/720p.m3u8` |

### 13.3 Media Processor Updates

The processor must insert variant records after processing completes.

#### Updated Worker Flow

```go
func (w *Worker) processJob(job *ProcessingJob) error {
    // ... existing download and processing logic ...

    // After uploading all files, insert variant records
    variants := []MediaVariant{
        {
            MediaID:      job.MediaID,
            VariantType:  "original",
            Bucket:       "fa-media",
            StoragePath:  archivePath,
            FileSize:     originalFileSize,
            MimeType:     originalMimeType,
            Width:        originalWidth,
            Height:       originalHeight,
        },
        {
            MediaID:      job.MediaID,
            VariantType:  "optimized",
            Bucket:       "fa-media",
            StoragePath:  optimizedPath,
            FileSize:     optimizedFileSize,
            MimeType:     "video/mp4", // or "image/jpeg"
            Width:        outputWidth,
            Height:       outputHeight,
            Duration:     videoDuration, // if video
        },
        {
            MediaID:      job.MediaID,
            VariantType:  "thumbnail",
            Bucket:       "fa-media",
            StoragePath:  thumbnailPath,
            FileSize:     thumbFileSize,
            MimeType:     "image/jpeg",
            Width:        thumbWidth,
            Height:       thumbHeight,
        },
    }

    // Upsert variants (handle re-processing)
    for _, v := range variants {
        w.db.UpsertMediaVariant(v)
    }

    // Update media status
    w.db.UpdateMediaReady(job.MediaID)

    return nil
}
```

#### Database Repository Method

```go
// internal/db/variants.go
func (r *Repository) UpsertMediaVariant(v MediaVariant) error {
    query := `
        INSERT INTO media_variants (
            media_id, variant_type, bucket, storage_path,
            file_size, mime_type, width, height, duration_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (media_id, variant_type) DO UPDATE SET
            storage_path = EXCLUDED.storage_path,
            file_size = EXCLUDED.file_size,
            mime_type = EXCLUDED.mime_type,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            duration_seconds = EXCLUDED.duration_seconds,
            created_at = NOW()
    `
    _, err := r.pool.Exec(context.Background(), query,
        v.MediaID, v.VariantType, v.Bucket, v.StoragePath,
        v.FileSize, v.MimeType, v.Width, v.Height, v.Duration,
    )
    return err
}
```

### 13.4 API Response Changes

#### Updated MediaWrapper Type

```typescript
// shared/types/media.ts

export type MediaVariant = {
  id: number;
  variantType: 'original' | 'optimized' | 'thumbnail' | string;
  bucket: string;
  storagePath: string;
  url?: string;  // Presigned URL (populated by API)
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type MediaWrapper = {
  id: number;
  description: string | null;
  type: MediaType;
  status: MediaStatus;

  // Primary URLs (for convenience, extracted from variants)
  url: string;           // Optimized variant URL (for playback)
  thumbnailUrl: string | null;  // Thumbnail URL (for grid display)

  // All available variants (for downloads, etc.)
  variants: MediaVariant[];
};
```

#### Updated API: GET /api/events/{id}/media

```typescript
// server/api/events/[id]/media.ts

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'id');
  const client = await serverSupabaseClient(event);

  // Fetch media with variants
  const { data: mediaRows, error } = await client
    .from('event-media')
    .select(`
      media (
        id,
        description,
        media_type,
        status,
        media_variants (
          id,
          variant_type,
          bucket,
          storage_path,
          file_size,
          mime_type,
          width,
          height,
          duration_seconds
        )
      )
    `)
    .eq('event_id', eventId);

  if (error) throw createError({ statusCode: 500, message: error.message });

  // Transform to MediaWrapper[] with presigned URLs
  const mediaList = await Promise.all(
    mediaRows.map(async (row) => {
      const media = row.media;
      const variants = media.media_variants || [];

      // Generate presigned URLs for each variant
      const variantsWithUrls = await Promise.all(
        variants.map(async (v) => ({
          ...v,
          variantType: v.variant_type,
          storagePath: v.storage_path,
          fileSize: v.file_size,
          mimeType: v.mime_type,
          durationSeconds: v.duration_seconds,
          url: await generatePresignedUrl(v.bucket, v.storage_path),
        }))
      );

      // Extract primary URLs
      const optimized = variantsWithUrls.find(v => v.variantType === 'optimized');
      const thumbnail = variantsWithUrls.find(v => v.variantType === 'thumbnail');

      return {
        id: media.id,
        description: media.description,
        type: mediaTypeFromDatabaseMediaType(media.media_type),
        status: media.status as MediaStatus,
        url: optimized?.url || '',
        thumbnailUrl: thumbnail?.url || null,
        variants: variantsWithUrls,
      };
    })
  );

  return mediaList;
});
```

### 13.5 Frontend Implementation

#### MediaGrid Component

```vue
<!-- app/components/MediaGrid.vue -->
<template>
  <UPageGrid>
    <UPageCard
      v-for="(media, idx) in mediaList"
      :key="media.id"
      class="cursor-pointer relative aspect-video overflow-hidden"
      @click="() => select(idx)"
    >
      <!-- Ready media: show thumbnail -->
      <template v-if="media.status === MediaStatus.Ready">
        <NuxtImg
          :src="media.thumbnailUrl ?? media.url"
          :alt="media.description ?? undefined"
          class="w-full h-full object-cover"
        />
        <!-- Video play indicator -->
        <div v-if="isVideo(media)" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-heroicons-play" class="size-16 text-white/80" />
        </div>
      </template>

      <!-- Non-ready media: placeholder -->
      <template v-else>
        <!-- ... existing placeholder code ... -->
      </template>
    </UPageCard>
  </UPageGrid>
</template>
```

#### MediaTheater Download Dropdown

```vue
<!-- app/components/MediaTheater.vue (new download section) -->
<template>
  <div class="media-theater">
    <!-- ... existing player code ... -->

    <!-- Download dropdown -->
    <UDropdownMenu v-if="currentMedia?.variants?.length">
      <UButton
        icon="i-heroicons-arrow-down-tray"
        label="Download"
        variant="ghost"
      />
      <template #content>
        <UDropdownItem
          v-for="variant in downloadableVariants"
          :key="variant.variantType"
          @click="downloadVariant(variant)"
        >
          <div class="flex items-center justify-between w-full">
            <span>{{ getVariantLabel(variant.variantType) }}</span>
            <span class="text-xs text-gray-500">
              {{ formatFileSize(variant.fileSize) }}
            </span>
          </div>
        </UDropdownItem>
      </template>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import type { MediaWrapper, MediaVariant } from '#shared/types/media';

const props = defineProps<{
  currentMedia: MediaWrapper | null;
}>();

// Filter to only downloadable variants (not thumbnails, HLS playlists)
const downloadableVariants = computed(() => {
  if (!props.currentMedia?.variants) return [];
  return props.currentMedia.variants.filter(v =>
    ['original', 'optimized'].includes(v.variantType)
  );
});

function getVariantLabel(type: string): string {
  switch (type) {
    case 'original': return 'Original (Full Quality)';
    case 'optimized': return 'Optimized (Web)';
    default: return type;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function downloadVariant(variant: MediaVariant) {
  if (!variant.url) return;

  // Trigger download
  const link = document.createElement('a');
  link.href = variant.url;
  link.download = getDownloadFilename(variant);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getDownloadFilename(variant: MediaVariant): string {
  const baseName = variant.storagePath.split('/').pop() || 'download';
  return baseName;
}
</script>
```

### 13.6 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROCESSING COMPLETE                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MEDIA PROCESSOR INSERTS VARIANTS                      │
│                                                                          │
│  INSERT INTO media_variants:                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ media_id │ variant_type │ storage_path                          │    │
│  │──────────│──────────────│────────────────────────────────────── │    │
│  │ 123      │ original     │ archive/abc_123_user.mp4             │    │
│  │ 123      │ optimized    │ optimized/abc_123_user_optimized.mp4 │    │
│  │ 123      │ thumbnail    │ thumbnails/abc_123_user_thumb.jpg    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  UPDATE media SET status = 'ready' WHERE id = 123                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND REQUESTS MEDIA                            │
│                                                                          │
│  GET /api/events/456/media                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NUXT API FETCHES AND TRANSFORMS                       │
│                                                                          │
│  1. SELECT media + media_variants WHERE event_id = 456                   │
│  2. Generate presigned URLs for each variant                             │
│  3. Return MediaWrapper[] with variants array                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND RECEIVES                                 │
│                                                                          │
│  {                                                                       │
│    id: 123,                                                              │
│    status: 'ready',                                                      │
│    url: 'https://...presigned.../optimized/abc_123_user_optimized.mp4', │
│    thumbnailUrl: 'https://...presigned.../thumbnails/abc_123_thumb.jpg',│
│    variants: [                                                           │
│      { variantType: 'original', url: '...', fileSize: 52428800 },       │
│      { variantType: 'optimized', url: '...', fileSize: 10485760 },      │
│      { variantType: 'thumbnail', url: '...', fileSize: 51200 },         │
│    ]                                                                     │
│  }                                                                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │   MediaGrid     │       │  MediaTheater   │
          │                 │       │                 │
          │ Uses            │       │ Uses url for    │
          │ thumbnailUrl    │       │ playback        │
          │ for grid cards  │       │                 │
          └─────────────────┘       │ Download menu   │
                                    │ shows variants  │
                                    │ with file sizes │
                                    └─────────────────┘
```

### 13.7 Migration Path

To implement this design:

1. **Database Migration** (Supabase)
   ```sql
   -- Run via Supabase MCP or Dashboard
   -- See schema in section 13.2
   ```

2. **Media Processor Update** (`lowreyarchives-media`)
   - Add `internal/db/variants.go` with `UpsertMediaVariant`
   - Update worker to insert variants after processing
   - Backfill existing processed media (one-time script)

3. **Nuxt API Update** (`lowreyarchives.com`)
   - Update `shared/types/media.ts` with new types
   - Update event media API to join and return variants
   - Update `server/utils/conversions.ts` for new structure

4. **Frontend Update** (`lowreyarchives.com`)
   - Update `MediaGrid.vue` to use `thumbnailUrl`
   - Add download dropdown to `MediaTheater.vue`

5. **Backfill Script** (one-time)
   ```sql
   -- Populate variants for already-processed media from processing_jobs
   INSERT INTO media_variants (media_id, variant_type, bucket, storage_path)
   SELECT
     pj.media_id,
     'original',
     'fa-media',
     pj.archive_path
   FROM processing_jobs pj
   WHERE pj.status = 'completed' AND pj.archive_path IS NOT NULL
   ON CONFLICT (media_id, variant_type) DO NOTHING;

   -- Repeat for optimized and thumbnail...
   ```

---

## Appendix A: Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Upload stuck at 99% | Multipart complete failed | Check S3 logs, verify parts array |
| Media stuck in "pending" | Scanner not detecting | Check media.media_url starts with "ingest/" |
| Media stuck in "processing" | Worker crashed | Check for stale jobs, restart processor |
| Thumbnail missing | Extraction failed | Check FFmpeg logs, verify video format |
| "Failed" status | Processing error | Check processing_jobs.error_message |

### Useful Queries

```sql
-- Find stuck jobs
SELECT * FROM processing_jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '1 hour';

-- Count jobs by status
SELECT status, COUNT(*) FROM processing_jobs GROUP BY status;

-- Find failed jobs with errors
SELECT id, media_id, error_message, retry_count
FROM processing_jobs
WHERE status = 'failed';

-- Find media without jobs
SELECT m.* FROM media m
LEFT JOIN processing_jobs pj ON m.id = pj.media_id
WHERE m.media_url LIKE 'ingest/%' AND pj.id IS NULL;
```

---

## Appendix B: References

- [Garage S3 Documentation](https://garagehq.deuxfleurs.fr/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [AWS S3 Multipart Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
