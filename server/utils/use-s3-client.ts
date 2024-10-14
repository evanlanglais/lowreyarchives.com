import { S3 } from "@aws-sdk/client-s3";
const runtimeConfig = useRuntimeConfig();

// @ts-ignore
const s3Client = new S3({
  forcePathStyle: true, // Configures to use subdomain/virtual calling format.
  endpoint: "http://minio.lowreyarchives.com:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: runtimeConfig.minioKey,
    secretAccessKey: runtimeConfig.minioKeySecret,
  },
});

export default function () {
  return s3Client;
}
