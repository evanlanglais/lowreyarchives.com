import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

    const body = await readBody(event);
    const { size, name } = body;

    const config = useRuntimeConfig();
    const accountId = config.cloudflareAccountId;
    const apiToken = config.cloudflareApiToken;

    if (!accountId || !apiToken) {
        throw createError({
            statusCode: 500,
            statusMessage: "Server configuration error: Missing Cloudflare credentials",
        });
    }

    // Cloudflare Stream API endpoint for TUS
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Tus-Resumable": "1.0.0",
                "Upload-Length": size.toString(),
                "Upload-Creator": user.id,
                // Metadata must be base64 encoded pairs
                "Upload-Metadata": `name ${Buffer.from(name || "video").toString("base64")}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Cloudflare API Error:", errorText);
            throw new Error(`Cloudflare API responded with ${response.status}`);
        }

        // The 'Location' header contains the TUS upload URL
        const uploadUrl = response.headers.get("Location");
        // The 'stream-media-id' header contains the video ID
        const mediaId = response.headers.get("stream-media-id");

        if (!uploadUrl) {
            throw new Error("No Location header received from Cloudflare");
        }

        return {
            uploadUrl,
            mediaId,
        };
    } catch (error) {
        console.error("Failed to initiate Cloudflare upload:", error);
        throw createError({
            statusCode: 502,
            statusMessage: "Failed to communicate with Cloudflare Stream",
        });
    }
});