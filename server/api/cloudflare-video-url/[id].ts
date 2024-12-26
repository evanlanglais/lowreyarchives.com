import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid ID",
    });
  }

  const runtimeConfig = useRuntimeConfig();

  // Get signed URL
  try {
    const tokenResponse = await $fetch(
      `https://api.cloudflare.com/client/v4/accounts/${runtimeConfig.cloudflareAccount}/stream/${id}/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtimeConfig.cloudflareKey}`,
          "content-type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
        }),
      },
    );

    if (!tokenResponse.success) {
      throw createError({
        statusCode: 500,
        statusMessage: "Unable to get access token",
      });
    }

    return `https://customer-${runtimeConfig.cloudflareStreamCode}.cloudflarestream.com/${tokenResponse.result.token}/manifest/video.m3u8`;
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      statusMessage: `Unable to get cloudflare video url`,
    });
  }
});
