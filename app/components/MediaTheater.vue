<script setup lang="ts">
import { computed } from "vue";
import { MediaStatus, type MediaWrapper } from "#shared/types/media";

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
</script>

<template>
  <div class="relative h-full w-full">
    <template v-if="media">
      <div class="h-full w-full grid grid-cols-[auto_1fr_auto] grid-rows-1 gap-2 p-2">
        <div class="flex items-center justify-center">
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

        <div class="min-h-0 min-w-0 flex items-center justify-center overflow-hidden">
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

        <div class="flex items-center justify-center">
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
