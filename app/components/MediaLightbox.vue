<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, shallowRef, createApp, h, type App } from "vue";
import PhotoSwipe, { type SlideData, type PhotoSwipeOptions } from "photoswipe";
import "photoswipe/style.css";
import { formatBytes } from "#shared/utils/utils";
import { MediaStatus, type MediaWrapper, type MediaVariant } from "#shared/types/media";
import type { DropdownMenuItem } from "@nuxt/ui";
import LightboxVideoSlide from "~/components/LightboxVideoSlide.vue";

const props = defineProps<{
  mediaList: MediaWrapper[];
  startIndex: number;
}>();

const emit = defineEmits<{
  close: [lastIndex: number];
}>();

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

const pswp = shallowRef<PhotoSwipe | null>(null);
const currIndex = ref(props.startIndex);
const downloadHost = ref<HTMLElement | null>(null);
const isDownloading = ref(false);

// Track mounted Vue apps per content host element so we can unmount them on deactivate.
const mountedApps = new WeakMap<HTMLElement, App>();

const currentMedia = computed<MediaWrapper | null>(() => props.mediaList[currIndex.value] ?? null);

const bestVariant = computed(() => {
  const m = currentMedia.value;
  if (!m?.variants) return null;
  return (
    m.variants.find((v) => v.variantType === "optimized") ||
    m.variants.find((v) => v.variantType === "original") ||
    null
  );
});

const downloadableVariants = computed<MediaVariant[]>(() => {
  const m = currentMedia.value;
  if (!m?.variants) return [];
  return m.variants.filter((v) => ["original", "optimized"].includes(v.variantType));
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

function downloadVariant(variant: MediaVariant) {
  if (isDownloading.value) return;
  isDownloading.value = true;
  try {
    const link = document.createElement("a");
    link.href = `/api/media/download?variantId=${variant.id}`;
    link.download = getDownloadFilename(variant);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    isDownloading.value = false;
  }
}

const downloadMenuItems = computed<DropdownMenuItem[]>(() =>
  downloadableVariants.value.map((variant) => ({
    label: getVariantLabel(variant.variantType),
    icon:
      variant.variantType === "original"
        ? "i-heroicons-document-arrow-down"
        : "i-heroicons-arrow-down-tray",
    slot: variant.fileSize ? formatBytes(variant.fileSize) : undefined,
    onSelect: () => downloadVariant(variant),
  })),
);

function placeholderHtml(media: MediaWrapper): string {
  const isFailed = media.status === MediaStatus.Failed;
  const iconColor = isFailed ? "#f87171" : "#9ca3af";
  const label =
    media.status === MediaStatus.Pending
      ? "Waiting to be processed..."
      : media.status === MediaStatus.Processing
        ? "Processing media..."
        : "Processing failed";
  const mainIcon = isFailed
    ? // exclamation triangle
      `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 17h.01"/></svg>`
    : media.isVideo
      ? // video camera
        `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="15" height="14" x="2" y="5" rx="2"/><path d="m22 8-6 4 6 4V8Z"/></svg>`
      : // photo
        `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
  return `
    <div class="pswp-placeholder">
      ${mainIcon}
      <span class="pswp-placeholder-label">${label}</span>
    </div>
  `;
}

function buildDataSource(): SlideData[] {
  // For html-type slides (video, placeholder) we want the slide to fill the
  // viewport so the player/placeholder controls its own aspect-fit. Using the
  // media's intrinsic dimensions would make PhotoSwipe shrink portrait content
  // into a tall narrow box and leave the player sized to that box.
  const viewportW = typeof window !== "undefined" ? window.innerWidth : DEFAULT_W;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : DEFAULT_H;

  return props.mediaList.map((media): SlideData => {
    const variant =
      media.variants?.find((v) => v.variantType === "optimized") ||
      media.variants?.find((v) => v.variantType === "original") ||
      null;

    if (media.status !== MediaStatus.Ready) {
      return { html: placeholderHtml(media), width: viewportW, height: viewportH };
    }

    if (media.isVideo) {
      return {
        html: `<div class="pswp-video-host" data-media-id="${media.id}"></div>`,
        width: viewportW,
        height: viewportH,
      };
    }

    return {
      src: media.url,
      msrc: media.thumbnailUrl ?? undefined,
      alt: media.description ?? undefined,
      width: variant?.width || DEFAULT_W,
      height: variant?.height || DEFAULT_H,
    };
  });
}

function mountVideoIntoSlide(contentEl: HTMLElement, media: MediaWrapper) {
  const host = contentEl.querySelector<HTMLElement>(".pswp-video-host");
  if (!host || mountedApps.has(host)) return;

  // Stop PhotoSwipe from intercepting pointer gestures on the video so
  // the player can handle scrubbing, seeking, and control taps.
  const stop = (e: Event) => e.stopPropagation();
  host.addEventListener("pointerdown", stop);
  host.addEventListener("click", stop);

  const variant =
    media.variants?.find((v) => v.variantType === "optimized") ||
    media.variants?.find((v) => v.variantType === "original") ||
    null;

  const app = createApp({
    render: () =>
      h(LightboxVideoSlide, {
        src: media.url,
        width: variant?.width,
        height: variant?.height,
      }),
  });
  app.mount(host);
  mountedApps.set(host, app);
}

function unmountVideoFromSlide(contentEl: HTMLElement) {
  const host = contentEl.querySelector<HTMLElement>(".pswp-video-host");
  if (!host) return;
  const app = mountedApps.get(host);
  if (app) {
    app.unmount();
    mountedApps.delete(host);
  }
}

onMounted(() => {
  const options: PhotoSwipeOptions = {
    dataSource: buildDataSource(),
    index: props.startIndex,
    bgOpacity: 1,
    showHideAnimationType: "fade",
    padding: { top: 56, bottom: 56, left: 0, right: 0 },
    closeOnVerticalDrag: true,
    pinchToClose: false,
    wheelToZoom: true,
  };

  const instance = new PhotoSwipe(options);

  instance.on("uiRegister", () => {
    instance.ui?.registerElement({
      name: "download-menu",
      order: 8,
      isButton: false,
      appendTo: "bar",
      onInit: (el) => {
        el.classList.add("pswp__download-host");
        downloadHost.value = el;
      },
    });
  });

  instance.on("change", () => {
    currIndex.value = instance.currIndex;
  });

  instance.on("contentActivate", ({ content }) => {
    const idx = content.index;
    const media = props.mediaList[idx];
    if (!media || media.status !== MediaStatus.Ready || !media.isVideo) return;
    const el = content.element as HTMLElement | undefined;
    if (el) mountVideoIntoSlide(el, media);
  });

  instance.on("contentDeactivate", ({ content }) => {
    const el = content.element as HTMLElement | undefined;
    if (el) unmountVideoFromSlide(el);
  });

  instance.on("contentDestroy", ({ content }) => {
    const el = content.element as HTMLElement | undefined;
    if (el) unmountVideoFromSlide(el);
  });

  instance.on("close", () => {
    emit("close", instance.currIndex);
  });

  instance.on("destroy", () => {
    pswp.value = null;
    downloadHost.value = null;
  });

  pswp.value = instance;
  instance.init();
});

onBeforeUnmount(() => {
  pswp.value?.destroy();
});
</script>

<template>
  <Teleport v-if="downloadHost && hasDownloads" :to="downloadHost">
    <UDropdownMenu
      v-if="downloadableVariants.length > 1"
      :items="downloadMenuItems"
      :portal="false"
    >
      <UButton
        icon="i-heroicons-arrow-down-tray"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="isDownloading"
        aria-label="Download"
        class="text-white/80 hover:text-white"
      />
    </UDropdownMenu>
    <UButton
      v-else
      icon="i-heroicons-arrow-down-tray"
      color="neutral"
      variant="ghost"
      size="sm"
      :loading="isDownloading"
      aria-label="Download"
      class="text-white/80 hover:text-white"
      @click="downloadVariant(downloadableVariants[0])"
    />
  </Teleport>
</template>

<style>
/* Placeholder rendered inside html-type slides for non-ready media. */
.pswp-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 2rem;
  color: rgb(229 231 235);
}
.pswp-placeholder-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(209 213 219);
}

/* PhotoSwipe top bar tweaks so our teleported download button sits comfortably. */
.pswp__download-host {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
}

/* Video slide host fills the available slide area. */
.pswp-video-host {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
