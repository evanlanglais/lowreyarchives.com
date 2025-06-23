import type { H3Event } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

async function getH3EventClaims(event: H3Event) {
  try {
    const user = await serverSupabaseUser(event);

    if (user) {
      event.context.user = user;
      const claims = [];
      event.context.claims = claims;
      return {
        user,
        claims,
      };
    } else {
      return {
        user: undefined,
        claims: undefined,
      };
    }
  } catch (e: any) {
    console.log("AUTH ERROR", e);
    throw e;
  }
}

export { getH3EventClaims };
