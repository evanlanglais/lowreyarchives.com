import { streamSignedUrl } from "~~/server/utils/cloudflare-utils";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid ID",
    });
  }

  return await streamSignedUrl(id);
});
