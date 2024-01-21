<template>
  <div>
    <h2>I am the uploader page</h2>
    <!--    <LoginCard>-->
    <!--      <div>-->
    <!--        <div v-if="complete">Upload complete 👍</div>-->
    <!--        <FormKit type="form" submit-label="Begin upload" @submit="uploadVideo">-->
    <!--          <FormKit-->
    <!--            type="file"-->
    <!--            label="Videos"-->
    <!--            accept=".mp4, .mkv, .webm, .mov, .avi, .flv, .wmv, .m4v, .3gp, .ogv, .mpeg, .mpg"-->
    <!--            name="videos"-->
    <!--            multiple="true"-->
    <!--            help="Select all videos you wish to upload"-->
    <!--            validation="required"-->
    <!--          />-->
    <!--          <div v-if="uploading">Progress: {{ progress }}/100</div>-->
    <!--        </FormKit>-->
    <!--      </div>-->
    <!--    </LoginCard>-->
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });
const file = ref<File | null>(null);
const complete = ref<Boolean>(false);
const uploading = ref<Boolean>(false);
const progress = ref<Number>(0);

const uploadVideo = async (data: { videos: Array<{ file: File }> }) => {
  const fileIndex = 0;
  uploading.value = true;

  for (const file of data.videos.map((video) => video.file)) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const fileType = file.type;
    const fileName = file.name;
    const fileSize = file.size;

    const startUploadResponse = await useFetch("/api/start-multipart-upload", {
      method: "post",
      body: {
        fileName,
        fileType,
      },
    });

    if (startUploadResponse.error.value || !startUploadResponse.data.value) {
      console.log(`Failed to initiate upload of file ${fileName}`);
      continue;
    }

    const uploadId = startUploadResponse.data.value.uploadId;
    const key = startUploadResponse.data.value.key;

    const chunks = Math.ceil(fileSize / chunkSize);
    const uploadedParts = [];

    for (let i = 0; i < chunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const response = await useFetch("/api/get-chunk-upload-url", {
        method: "post",
        body: {
          key,
          fileType,
          uploadId,
          partNumber: i + 1,
        },
      });

      const presignedUrl = response.data.value.presignedUrl;
      const uploadResponse = await $fetch.raw(presignedUrl, {
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

      progress.value =
        (((i / chunks) * (fileIndex + 1)) / data.videos.length) * 100;
    }

    await useFetch("/api/finish-multipart-upload", {
      method: "post",
      body: {
        key,
        uploadId,
        parts: uploadedParts,
      },
    });
  }

  complete.value = true;
  uploading.value = false;
};
</script>
