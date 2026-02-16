<script setup lang="ts">
import { formatBytes } from "#shared/utils/utils";
import { MediaStatus, type MediaWrapper, type MediaVariant } from "#shared/types/media";
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
  media: MediaWrapper | null;
}>();

const bestVariant = computed(() => {
  if (!props.media?.variants) return null;
  return (
    props.media.variants.find((v) => v.variantType === "optimized") ||
    props.media.variants.find((v) => v.variantType === "original") ||
    null
  );
});

const dimensions = computed(() => {
  const v = bestVariant.value;
  if (!v?.width || !v?.height) return null;
  return `${v.width} x ${v.height}`;
});

const fileSize = computed(() => {
  const v = bestVariant.value;
  if (!v?.fileSize) return null;
  return formatBytes(v.fileSize);
});

const duration = computed(() => {
  const v = bestVariant.value;
  if (!v?.durationSeconds) return null;
  const totalSeconds = Math.round(v.durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const downloadableVariants = computed(() => {
  if (!props.media?.variants) return [];
  return props.media.variants.filter((v) =>
    ["original", "optimized"].includes(v.variantType),
  );
});

const hasDownloads = computed(
  () => downloadableVariants.value.length > 0 && props.media?.status === MediaStatus.Ready,
);

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

function getDownloadFilename(variant: MediaVariant): string {
  return variant.storagePath.split("/").pop() || "download";
}

const isDownloading = ref(false);

function downloadVariant(variant: MediaVariant) {
  if (isDownloading.value) return;

  isDownloading.value = true;
  try {
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

const downloadMenuItems = computed((): DropdownMenuItem[] => {
  return downloadableVariants.value.map((variant) => ({
    label: getVariantLabel(variant.variantType),
    icon:
      variant.variantType === "original"
        ? "i-heroicons-document-arrow-down"
        : "i-heroicons-arrow-down-tray",
    slot: variant.fileSize ? formatBytes(variant.fileSize) : undefined,
    onSelect: () => downloadVariant(variant),
  }));
});
</script>

<template>
  <div
    v-if="media"
    class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-y border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400"
  >
    <span v-if="dimensions" class="flex items-center gap-1">
      <UIcon name="i-heroicons-arrows-pointing-out" class="size-4" />
      {{ dimensions }}
    </span>
    <span v-if="fileSize" class="flex items-center gap-1">
      <UIcon name="i-heroicons-document" class="size-4" />
      {{ fileSize }}
    </span>
    <span v-if="duration" class="flex items-center gap-1">
      <UIcon name="i-heroicons-clock" class="size-4" />
      {{ duration }}
    </span>

    <div v-if="hasDownloads" class="ml-auto">
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
  </div>
</template>
