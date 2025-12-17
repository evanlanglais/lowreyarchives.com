import {S3} from "@aws-sdk/client-s3";

const runtimeConfig = useRuntimeConfig();

const s3Client = new S3({
    forcePathStyle: true,
    endpoint: runtimeConfig.s3Url,
    region: runtimeConfig.s3Region,
    credentials: {
        accessKeyId: runtimeConfig.s3Key,
        secretAccessKey: runtimeConfig.s3KeySecret,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
});

export default function () {
    return s3Client;
}
