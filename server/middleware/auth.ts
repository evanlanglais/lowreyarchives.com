import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  // await getH3EventClaims(event);
  //
  // if (event.node.req.url?.startsWith("/api")) {
  //   if (!event.context.user) {
  //     throw createError({
  //       statusCode: 401,
  //       statusMessage: "User not authenticated!",
  //     });
  //   }
  // }
});
