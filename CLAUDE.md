# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
yarn install          # Install dependencies
yarn dev              # Start development server on http://localhost:3000
yarn build            # Build for production
yarn preview          # Preview production build locally
yarn lint             # Run ESLint
yarn lint:fix         # Run ESLint with auto-fix
yarn typecheck        # Run TypeScript type checking
```

Requires Node.js >= 20.19.0. Uses Yarn 1.x as package manager.

## Architecture Overview

This is a Nuxt 4 SPA (SSR disabled) for managing family media archives. It deploys to Azure Static Web Apps.

### Key Technologies
- **Frontend**: Nuxt 4, Vue 3, Pinia, Nuxt UI v4, Tailwind CSS v4
- **Backend**: Supabase (auth + PostgreSQL), S3-compatible storage (Garage), Cloudflare Stream for video
- **Video Player**: Vidstack with HLS.js support

### Directory Structure

- `app/` - Nuxt app layer
  - `pages/` - File-based routing (groups, events, archive, upload, auth pages)
  - `components/` - Vue components (MediaTheater, MediaGrid, MediaUploader, etc.)
  - `stores/` - Pinia stores using custom `defineApiStore` pattern
  - `composables/` - Custom composables including `useApiStore`
  - `utils/cache.ts` - Client-side request deduplication and caching
- `server/` - Nitro server
  - `api/` - API routes for events, groups, users, and media upload
  - `utils/` - Server utilities (S3 client, Cloudflare helpers, auth claims)
- `shared/` - Code shared between client and server
  - `types/` - TypeScript types including Supabase-generated `database.types.ts`
  - `utils/cacheKeys.ts` - Cache key generators for nuxt-multi-cache

### Data Model

Core entities in Supabase: `groups`, `events`, `media` with junction tables `group-users`, `group-events`, `event-media`, `user-events`. Media types include YouTube URLs, video URLs, photos, bucket videos, and Cloudflare videos.

### State Management Pattern

Stores use `defineApiStore` (`app/composables/useApiStore.ts`) which wraps Pinia with automatic client-side caching via `createCacheLoader`. This provides request deduplication and TTL-based caching (default 5 min).

### Media Upload Flow

Large file uploads use S3 multipart uploads with server-side presigned URLs:
- `start-multipart-upload.post.ts` - Initiates upload
- `get-chunk-upload-url.post.ts` - Gets presigned URL for each chunk
- `finish-multipart-upload.post.ts` - Completes the upload
- `abort-multipart-upload.post.ts` - Cancels failed uploads

Videos can also be uploaded to Cloudflare Stream via `media-upload/cloudflare-video.post.ts`.

### Media Processing System

**Full documentation**: See [`docs/MEDIA_PROCESSING_DESIGN.md`](docs/MEDIA_PROCESSING_DESIGN.md)

The media processing pipeline involves:
1. **Upload** → Files uploaded to `fa-dmz` ingest bucket via multipart upload
2. **Detection** → Media processor (`~/wd/lowreyarchives-media`) scans for pending media
3. **Processing** → Videos transcoded via FFmpeg, images resized, thumbnails generated
4. **Storage** → Original archived to `fa-media/archive/`, optimized to `fa-media/optimized/`
5. **Status** → Database updated: `media.status` transitions pending → processing → ready/failed

Key tables: `media` (with status column), `processing_jobs` (job queue with atomic claiming)

### Runtime Configuration

Sensitive config is in `nuxt.config.ts` runtimeConfig (S3 credentials, Cloudflare keys). Public config includes the base URL. Environment variables are set via `.env` locally and GitHub secrets for deployment.