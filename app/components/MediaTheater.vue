<script setup lang="ts">
import {computed} from "vue";
import {MediaType, type MediaWrapper} from "#shared/types/media";

const props = defineProps<{
  media: MediaWrapper | null;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits(['previous', 'next']);

const isVideo = computed((): boolean => {
  if (!props.media) {
    return false;
  }

  switch (props.media.type) {
    case MediaType.Video:
    case MediaType.Youtube:
    case MediaType.BucketVideo:
    case MediaType.CloudflareVideo:
      return true;
    case MediaType.Photo:
      return false;
    default:
      return false;
  }
});

const isFirst = computed(() => props.isFirst ?? false);
const isLast = computed(() => props.isLast ?? false);
</script>

<template>
  <div class="relative h-full w-full">
    <template v-if="media">
      <div class="h-full w-full grid grid-cols-2 grid-rows-[1fr_auto] md:grid-cols-[auto_1fr_auto] md:grid-rows-1 gap-2 p-2">
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

        <div class="col-span-2 row-start-1 md:col-span-1 md:col-start-2 md:row-start-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden relative">
          <ModernPlayer
              v-if="isVideo"
              :src="media.url"
              class="max-h-full max-w-full object-contain"
          />
          <img
              v-else
              :src="media.url"
              class="max-h-full max-w-full object-contain"
              :alt="media.description"
          >
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
