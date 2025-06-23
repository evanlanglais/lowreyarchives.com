<script setup lang="ts">
import { computed, defineEmits, defineProps } from "vue";
import { MediaType, type MediaWrapper } from "#shared/types/media";

const props = defineProps<{
  media: MediaWrapper | null;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits(['previous', 'next']);

const isVideo = computed((): boolean => {
  if (!props.media){
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
  <div class="relative h-full flex items-center justify-center">
    <template v-if="media">
      <ModernPlayer
        v-if="isVideo"
        :src="media.url"
        class="max-h-full"
      />
      <img
        v-else
        :src="media.url"
        class="max-h-full"
        :alt="media.description"
      >
      <!-- Navigation Buttons -->
      <UButton
        v-if="!isFirst"
        icon="i-heroicons-chevron-left"
        variant="ghost"
        size="lg"
        class="absolute left-4 rounded-full z-50"
        @click="$emit('previous')"
      />
      <UButton
        v-if="!isLast"
        icon="i-heroicons-chevron-right"
        variant="ghost"
        size="lg"
        class="absolute right-4 rounded-full z-50"
        @click="$emit('next')"
      />
    </template>
    <UPageCTA
        v-else
        title="No Media Selected"
        description="Select media below to view on the big screen!"
    />
  </div>
</template>

<style scoped></style>
