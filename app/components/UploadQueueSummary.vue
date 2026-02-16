<script setup lang="ts">
import { formatBytes } from "#shared/utils/utils";
import type MediaUploader from "~/components/MediaUploader.vue";

const props = defineProps<{
  uploaderRef: InstanceType<typeof MediaUploader> | null;
}>();

const queuedFilesCount = computed(() => {
  if (!props.uploaderRef?.mediaUploadStateMap) return 0;
  return props.uploaderRef.mediaUploadStateMap.size;
});

const queuedVideosCount = computed(() => {
  if (!props.uploaderRef?.mediaUploadStateMap) return 0;
  let total = 0;
  for (const [_, state] of props.uploaderRef.mediaUploadStateMap) {
    if (state.file.type.startsWith("video/")) total++;
  }
  return total;
});

const queuedImagesCount = computed(() => {
  return queuedFilesCount.value - queuedVideosCount.value;
});

const queuedFilesDescription = computed(() => {
  let returnString = "";
  returnString += `${queuedVideosCount.value} Video${queuedVideosCount.value != 1 ? "s" : ""}, `;
  returnString += `${queuedImagesCount.value} Image${queuedImagesCount.value != 1 ? "s" : ""}`;
  return returnString;
});

const queuedTotalSize = computed(() => {
  if (!props.uploaderRef?.mediaUploadStateMap) return 0;
  let total = 0;
  for (const [_, state] of props.uploaderRef.mediaUploadStateMap) {
    total += state.file.size;
  }
  return total;
});
</script>

<template>
  <div class="flex items-center justify-between">
    <div>
      <p class="text-2xl font-bold">{{ queuedFilesDescription }}</p>
      <p class="text-sm text-gray-500">Files to upload</p>
    </div>
    <div class="text-right">
      <p class="text-lg font-mono">{{ formatBytes(queuedTotalSize) }}</p>
      <p class="text-sm text-gray-500">Total size</p>
    </div>
  </div>
</template>
