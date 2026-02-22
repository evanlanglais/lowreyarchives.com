On <script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from "vue";
import { useScrollLock, onKeyStroke } from "@vueuse/core";
import { formatBytes } from "#shared/utils/utils";
import { MediaStatus, type MediaWrapper, type MediaVariant } from "#shared/types/media";
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
  mediaList: MediaWrapper[];
  startIndex: number;
}>();

const emit = defineEmits<{
  close: [lastIndex: number];
}>();

const currentIndex = ref(props.startIndex);

const currentMedia = computed(() => props.mediaList[currentIndex.value] || null);
const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(() => currentIndex.value === props.mediaList.length - 1);
const counter = computed(() => `${currentIndex.value + 1} / ${props.mediaList.length}`);

// Scroll lock
const scrollLock = useScrollLock(
  typeof document !== "undefined" ? document.body : null,
);
scrollLock.value = true;

// Navigation
function prev() {
  if (!isFirst.value) currentIndex.value--;
}
function next() {
  if (!isLast.value) currentIndex.value++;
}

onKeyStroke("ArrowLeft", (e) => {
  e.preventDefault();
  prev();
});
onKeyStroke("ArrowRight", (e) => {
  e.preventDefault();
  next();
});
onKeyStroke("Escape", () => onClose());

function onClose() {
  scrollLock.value = false;
  emit("close", currentIndex.value);
}

const show = ref(false);
onMounted(() => {
  show.value = true;
});

onBeforeUnmount(() => {
  scrollLock.value = false;
});

// Media info
const bestVariant = computed(() => {
  if (!currentMedia.value?.variants) return null;
  return (
    currentMedia.value.variants.find((v) => v.variantType === "optimized") ||
    currentMedia.value.variants.find((v) => v.variantType === "original") ||
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

// Download
const downloadableVariants = computed(() => {
  if (!currentMedia.value?.variants) return [];
  return currentMedia.value.variants.filter((v) =>
    ["original", "optimized"].includes(v.variantType),
  );
});

const hasDownloads = computed(
  () => downloadableVariants.value.length > 0 && currentMedia.value?.status === MediaStatus.Ready,
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
  <Teleport to="body">
    <Transition name="fade">
      <div v-show="show" class="fixed inset-0 z-50 flex flex-col bg-black">
        <!-- Top bar -->
        <div class="shrink-0 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <span class="text-white/70 text-sm font-medium">{{ counter }}</span>

          <div class="flex items-center gap-3 text-sm text-white/50">
            <span v-if="dimensions" class="hidden sm:flex items-center gap-1">
              <UIcon name="i-heroicons-arrows-pointing-out" class="size-4" />
              {{ dimensions }}
            </span>
            <span v-if="fileSize" class="hidden sm:flex items-center gap-1">
              <UIcon name="i-heroicons-document" class="size-4" />
              {{ fileSize }}
            </span>
            <span v-if="duration" class="hidden sm:flex items-center gap-1">
              <UIcon name="i-heroicons-clock" class="size-4" />
              {{ duration }}
            </span>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <!-- Download -->
            <template v-if="hasDownloads">
              <UDropdownMenu v-if="downloadableVariants.length > 1" :items="downloadMenuItems" :portal="false">
                <UButton
                  icon="i-heroicons-arrow-down-tray"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :loading="isDownloading"
                  class="text-white/70 hover:text-white"
                />
              </UDropdownMenu>
              <UButton
                v-else
                icon="i-heroicons-arrow-down-tray"
                color="neutral"
                variant="ghost"
                size="sm"
                :loading="isDownloading"
                class="text-white/70 hover:text-white"
                @click="downloadVariant(downloadableVariants[0])"
              />
            </template>
            <!-- Close -->
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              class="text-white/70 hover:text-white"
              @click="onClose"
            />
          </div>
        </div>

        <!-- Middle: nav + media -->
        <div class="flex-1 min-h-0 flex items-center">
          <!-- Previous button -->
          <div class="shrink-0 w-10 sm:w-14 flex items-center justify-center">
            <button
              v-if="!isFirst"
              class="rounded-full p-1.5 sm:p-2 text-white/60 transition-colors hover:text-white"
              @click="prev"
            >
              <UIcon name="i-heroicons-chevron-left" class="size-5 sm:size-6" />
            </button>
          </div>

          <!-- Media content -->
          <div class="flex-1 min-h-0 min-w-0 flex items-center justify-center">
            <template v-if="currentMedia">
              <template v-if="currentMedia.status === MediaStatus.Ready">
                <!-- Video -->
                <ModernPlayer
                  v-if="currentMedia.isVideo"
                  :key="currentMedia.id"
                  :src="currentMedia.url"
                  class="w-full max-h-full"
                />
                <!-- Photo -->
                <MediaViewerPhoto
                  v-else
                  :key="currentMedia.id"
                  :src="currentMedia.url"
                  :alt="currentMedia.description ?? undefined"
                  :is-first="isFirst"
                  :is-last="isLast"
                  @previous="prev"
                  @next="next"
                />
              </template>

              <!-- Non-ready media placeholder -->
              <div v-else class="flex flex-col items-center justify-center gap-3 text-center p-8">
                <UIcon
                  :name="currentMedia.status === MediaStatus.Failed ? 'i-heroicons-exclamation-triangle' : currentMedia.isVideo ? 'i-heroicons-video-camera' : 'i-heroicons-photo'"
                  :class="[
                    'size-16',
                    currentMedia.status === MediaStatus.Failed ? 'text-red-400' : 'text-gray-500',
                  ]"
                />
                <div class="flex items-center gap-2">
                  <UIcon
                    v-if="currentMedia.status === MediaStatus.Pending"
                    name="i-heroicons-clock"
                    class="size-5 text-yellow-400"
                  />
                  <UIcon
                    v-else-if="currentMedia.status === MediaStatus.Processing"
                    name="i-heroicons-arrow-path"
                    class="size-5 text-blue-400 animate-spin"
                  />
                  <UIcon
                    v-else-if="currentMedia.status === MediaStatus.Failed"
                    name="i-heroicons-x-circle"
                    class="size-5 text-red-400"
                  />
                  <span class="text-sm font-medium text-gray-300">
                    {{ currentMedia.status === MediaStatus.Pending ? 'Waiting to be processed...' : currentMedia.status === MediaStatus.Processing ? 'Processing media...' : 'Processing failed' }}
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- Next button -->
          <div class="shrink-0 w-10 sm:w-14 flex items-center justify-center">
            <button
              v-if="!isLast"
              class="rounded-full p-1.5 sm:p-2 text-white/60 transition-colors hover:text-white"
              @click="next"
            >
              <UIcon name="i-heroicons-chevron-right" class="size-5 sm:size-6" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
