<template>
  <UContainer>
    <UPage>
      <UPageHeader headline="Uploader" title="Upload Media" description="" />
      <UPageBody>
        <UCard v-if="!uploading">
          <template #header>
            <h3>Upload things here</h3>
          </template>

          <UForm
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
            @error="onError"
          >
            <UInput
              type="file"
              size="lg"
              icon="i-heroicons-folder"
              multiple
              accept="video/*"
              required
              @change="
                (e: FileList) => {
                  state.videos = e;
                }
              "
            />

            <UButton type="submit"> Upload </UButton>
          </UForm>
        </UCard>
        <div v-if="uploading">
          <UCard v-for="[key, value] of videoUploadStateMap" :key="key">
            <template #header>
              <h3>{{ key }}</h3>
            </template>

            <div v-if="value.state == VIDEO_UPLOAD_STATE.INITIAL">
              <p>Initializing Upload</p>
            </div>

            <div v-if="value.state == VIDEO_UPLOAD_STATE.FAILED">
              <span class="accent-red-600">{{ value.errorText }}</span>
            </div>

            <div v-if="value.state == VIDEO_UPLOAD_STATE.UPLOADING">
              <UProgress :value="value.progress"></UProgress>
            </div>
            <div v-if="value.state == VIDEO_UPLOAD_STATE.COMPLETED">
              <span class="accent-red-600">Upload Completed</span>
            </div>
          </UCard>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
import type { FormError, FormErrorEvent, FormSubmitEvent } from "#ui/types";
const state = reactive({
  videos: undefined as FileList | undefined,
});

enum VIDEO_UPLOAD_STATE {
  INITIAL,
  UPLOADING,
  FAILED,
  COMPLETED,
}

const uploading = ref<boolean>(false);
const videoUploadStateMap = ref<
  Map<
    string,
    { state: VIDEO_UPLOAD_STATE; errorText: string; progress: number }
  >
>(
  new Map<
    string,
    { state: VIDEO_UPLOAD_STATE; errorText: string; progress: number }
  >(),
);

function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id);
  element?.focus();
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function onSubmit(event: FormSubmitEvent<any>) {
  uploading.value = true;
  const promises = [];
  if (state.videos === undefined) return;
  for (let i = 0; i < state.videos.length; i++) {
    promises.push(uploadVideo(state.videos[i]));
  }
  await Promise.all(promises);
  uploading.value = false;
}

async function uploadVideo(file: File) {
  const chunkSize = 50 * 1024 * 1024; // 50MB
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = file.size;

  const videoStatus = {
    state: VIDEO_UPLOAD_STATE.INITIAL,
    errorText: "",
    progress: 0,
  };

  videoUploadStateMap.value?.set(fileName, videoStatus);

  try {
    const startUploadResponse = await $fetch("/api/start-multipart-upload", {
      method: "post",
      body: {
        fileName,
        fileType,
      },
    });

    const chunks = Math.ceil(fileSize / chunkSize);
    const uploadedParts = [];

    for (let i = 0; i < chunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      try {
        const response = await $fetch("/api/get-chunk-upload-url", {
          method: "post",
          body: {
            key: startUploadResponse.key,
            fileType,
            uploadId: startUploadResponse.uploadId,
            partNumber: i + 1,
          },
        });

        const uploadResponse = await $fetch.raw(response.presignedUrl, {
          method: "put",
          headers: {
            "Content-Type": fileType,
          },
          body: chunk,
        });

        uploadedParts.push({
          ETag: uploadResponse.headers.get("ETag"),
          PartNumber: i + 1,
        });

        videoStatus.progress = (i / chunks) * 100;
        videoStatus.state = VIDEO_UPLOAD_STATE.UPLOADING;
        videoUploadStateMap.value.set(fileName, { ...videoStatus });
      } catch (error) {
        videoStatus.state = VIDEO_UPLOAD_STATE.FAILED;
        videoStatus.errorText = "Failed to upload chunk";
        videoUploadStateMap.value.set(fileName, { ...videoStatus });
        break;
      }
    }

    try {
      await $fetch("/api/finish-multipart-upload", {
        method: "post",
        body: {
          key: startUploadResponse.key,
          uploadId: startUploadResponse.uploadId,
          parts: uploadedParts,
        },
      });

      videoStatus.state = VIDEO_UPLOAD_STATE.COMPLETED;
      videoUploadStateMap.value.set(fileName, { ...videoStatus });
    } catch (error) {
      videoStatus.state = VIDEO_UPLOAD_STATE.FAILED;
      videoStatus.errorText = "Unable to finish upload";
      videoUploadStateMap.value.set(fileName, { ...videoStatus });
    }
  } catch (error) {
    console.error(error);
    videoStatus.state = VIDEO_UPLOAD_STATE.FAILED;
    videoStatus.errorText = "Unable to start upload";
    videoUploadStateMap.value.set(fileName, { ...videoStatus });
  }
}
</script>
