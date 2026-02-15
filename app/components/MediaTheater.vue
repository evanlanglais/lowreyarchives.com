<script setup lang="ts">
import { computed } from "vue";
import { MediaStatus, type MediaWrapper, type MediaVariant } from "#shared/types/media";
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
  media: MediaWrapper | null;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits(["previous", "next"]);

const isVideo = computed((): boolean => {
  return props.media?.isVideo ?? false;
});

const isReady = computed(() => props.media?.status === MediaStatus.Ready);

const isFirst = computed(() => props.isFirst ?? false);
const isLast = computed(() => props.isLast ?? false);

// Filter to only downloadable variants (not thumbnails, HLS playlists)
const downloadableVariants = computed(() => {
  if (!props.media?.variants) return [];
  return props.media.variants.filter((v) =>
    ["original", "optimized"].includes(v.variantType),
  );
});

// Check if download should be shown
const hasDownloads = computed(() => downloadableVariants.value.length > 0);

function getVariantLabel(type: string): string {
  switch (type) {
    case "original":
      return "Original (Full Quality)";
    case "optimized":
      return "Optimized (Web)";
    default:
      return type;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getDownloadFilename(variant: MediaVariant): string {
  return variant.storagePath.split("/").pop() || "download";
}

const isDownloading = ref(false);

function downloadVariant(variant: MediaVariant) {
  if (isDownloading.value) return;

  isDownloading.value = true;
  try {
    // Use server-side proxy to avoid CORS issues and properly trigger download
    const downloadUrl = `/api/media/download?variantId=${variant.id}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = getDownloadFilename(variant);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    isDownloading.value = false;
  }
}

// Build dropdown menu items for downloads
const downloadMenuItems = computed((): DropdownMenuItem[] => {
  return downloadableVariants.value.map((variant) => ({
    label: getVariantLabel(variant.variantType),
    icon:
      variant.variantType === "original"
        ? "i-heroicons-document-arrow-down"
        : "i-heroicons-arrow-down-tray",
    slot: variant.fileSize ? formatFileSize(variant.fileSize) : undefined,
    onSelect: () => downloadVariant(variant),
  }));
});
</script>

<template>
  <div class="relative h-full w-full">
    <template v-if="media">
      <div class="h-full w-full grid grid-cols-2 grid-rows-[1fr_auto_auto] md:grid-cols-[auto_1fr_auto] md:grid-rows-[1fr_auto] gap-2 p-2">
        <div class="col-start-1 row-start-2 md:col-start-1 md:row-start-1 flex items-center justify-end md:justify-center">
          <UButton
              :class="{ invisible: isFirst }"
              :disabled="isFirst"
              icon="i-heroicons-chevron-left"
              variant="ghost"
              size="lg"
              class="rounded-full"
              @click="$emit('previous')"
          />
        </div>

        <div class="col-span-2 row-start-1 md:col-span-1 md:col-start-2 md:row-start-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden">
          <template v-if="isReady">
            <ModernPlayer
                v-if="isVideo"
                :src="media.url"
                class="max-h-full max-w-full object-contain"
            />
            <img
                v-else
                :src="media.url"
                class="max-h-full max-w-full object-contain"
                :alt="media.description ?? undefined"
            >
          </template>
          <div v-else class="flex flex-col items-center justify-center gap-3 text-center p-8">
            <UIcon
                :name="media.status === MediaStatus.Failed ? 'i-heroicons-exclamation-triangle' : media.isVideo ? 'i-heroicons-video-camera' : 'i-heroicons-photo'"
                :class="[
                  'size-16',
                  media.status === MediaStatus.Failed ? 'text-red-400' : 'text-gray-400 dark:text-gray-500',
                ]"
            />
            <div class="flex items-center gap-2">
              <UIcon
                  v-if="media.status === MediaStatus.Pending"
                  name="i-heroicons-clock"
                  class="size-5 text-yellow-400"
              />
              <UIcon
                  v-else-if="media.status === MediaStatus.Processing"
                  name="i-heroicons-arrow-path"
                  class="size-5 text-blue-400 animate-spin"
              />
              <UIcon
                  v-else-if="media.status === MediaStatus.Failed"
                  name="i-heroicons-x-circle"
                  class="size-5 text-red-400"
              />
              <span class="text-sm font-medium text-gray-300">
                {{ media.status === MediaStatus.Pending ? 'Waiting to be processed...' : media.status === MediaStatus.Processing ? 'Processing media...' : 'Processing failed' }}
              </span>
            </div>
            <p v-if="media.description" class="text-xs text-gray-500 max-w-sm">{{ media.description }}</p>
          </div>
        </div>

        <!-- Download button - centered in bottom row on mobile -->
        <div v-if="hasDownloads && isReady" class="col-span-2 row-start-3 md:col-span-1 md:col-start-2 md:row-start-2 flex items-center justify-center">
          <UDropdownMenu :items="downloadMenuItems">
            <UButton
                icon="i-heroicons-arrow-down-tray"
                variant="soft"
                color="neutral"
                size="sm"
                :loading="isDownloading"
            >
              Download
            </UButton>
          </UDropdownMenu>
        </div>

        <div class="col-start-2 row-start-2 md:col-start-3 md:row-start-1 flex items-center justify-start md:justify-center">
          <UButton
              :class="{ invisible: isLast }"
              :disabled="isLast"
              icon="i-heroicons-chevron-right"
              variant="ghost"
              size="lg"
              class="rounded-full"
              @click="$emit('next')"
          />
        </div>
      </div>
    </template>
    <div
        v-else
        class="h-full flex items-center justify-center"
    >
      <UPageCTA
          title="No Media Selected"
          description="Select media below to view on the big screen!"
      />
    </div>
  </div>
</template>

<style scoped></style>
