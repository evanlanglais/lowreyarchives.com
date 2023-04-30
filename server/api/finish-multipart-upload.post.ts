import {serverSupabaseUser} from "#supabase/server";
import useS3Client from "~/server/utils/use-s3-client";

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user)
    {
        throw createError({
            statusCode: 400
        });
    }

    const body = await readBody(event);

    const uploadId = body.uploadId;
    const parts = body.parts;
    const key = body.key;

    const params = {
        Bucket: "videoarchive1",
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts,
        },
    };

    try {
        await useS3Client().completeMultipartUpload(params);
        return;
    } catch (error) {
        console.error(error);
        throw createError({
            statusCode: 500
        });
    }
})