import { S3 } from "@aws-sdk/client-s3";

// @ts-ignore
const s3Client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: "https://nyc3.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.DG_KEY,
        secretAccessKey: process.env.DG_SECRET
    }
});

export default function () {

    return s3Client;
}
