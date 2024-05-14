<script setup lang="ts">
import { MediaType, type MediaWrapper } from "~/types/media";

const supabase = useSupabaseClient();

const props = defineProps<{
  media: MediaWrapper;
}>();

const isVideo = computed((): boolean => {
  switch (props.media.type) {
    case MediaType.Video:
    case MediaType.Youtube:
    case MediaType.BucketVideo:
      return true;
    case MediaType.Photo:
      return false;
    default:
      return false;
  }
});

const { data: mediaUrl } = await useAsyncData(
  `media-${props.media.id}-url`,
  async () => {
    switch (props.media.type) {
      case MediaType.Youtube:
      case MediaType.Video:
      case MediaType.Photo:
        return props.media.url;
      case MediaType.BucketVideo: {
        console.log(`video url: ${props.media.url}`);
        const { data, error } = await supabase.storage
          .from("video")
          .createSignedUrl(props.media.url, 3600);

        return data?.signedUrl;
      }
      default:
        console.error("Unknown media type");
        break;
    }
  },
);

// async function getMediaUrl() {
//   switch (props.media.type) {
//     case MediaType.Youtube:
//     case MediaType.Video:
//     case MediaType.Photo:
//       mediaUrl.value = props.media.url;
//       break;
//     case MediaType.BucketVideo: {
//       const { data, error } = await supabase.storage
//         .from("video")
//         .createSignedUrl(props.media.url, 3600);
//       if (error) throw error;
//
//       mediaUrl.value = data?.signedUrl;
//       break;
//     }
//     default:
//       console.error("Unknown media type");
//       break;
//   }
// }
//
// onMounted(() => {
//   getMediaUrl();
// });
</script>

<template>
  <UPageCard :description="media.description ?? ''">
    <UProgress v-if="!mediaUrl" animation="carousel" />
    <ModernPlayer v-if="isVideo && !!mediaUrl" :src="mediaUrl" />
  </UPageCard>
</template>

<style scoped></style>
