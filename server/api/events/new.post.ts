
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { EventWrapper } from "#shared/types/event";

type CreateEventRequest = {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    shareWithGroups?: number[];
    taggedUsers?: string[];
    shareWithUsers?: string[];
};

export default defineEventHandler(async (event): Promise<EventWrapper> => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

    const body = await readBody<CreateEventRequest>(event);

    if (!body.title || !body.startDate) {
        throw createError({
            statusCode: 400,
            statusMessage: "Title and Start Date are required",
        });
    }

    const client = await serverSupabaseClient(event);

    // Insert the new event
    const { data: newEvent, error: eventError } = await client
        .from("events")
        .insert({
            title: body.title,
            description: body.description || null,
            start_date: body.startDate,
            end_date: body.endDate || null,
            created_by: user.sub,
        })
        .select(
            `id,
       title,
       description,
       start_date,
       end_date`
        )
        .single();

    if (eventError) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to create event: ${eventError.message}`,
        });
    }

    // Add creator to user-events so they always have access to their own event
    const { error: creatorLinkError } = await client
        .from("user-events")
        .insert({
            user_id: user.id as string,
            event_id: newEvent.id,
            relationship_type: "creator",
        });

    if (creatorLinkError) {
        console.error("Failed to link creator to event:", creatorLinkError);
        // Don't fail the request - the event was created, just the link failed
    }

    // Share with groups
    if (body.shareWithGroups && body.shareWithGroups.length > 0) {
        const groupEventRecords = body.shareWithGroups.map((groupId) => ({
            group_id: groupId,
            event_id: newEvent.id,
        }));

        const { error: groupEventError } = await client
            .from("group-events")
            .insert(groupEventRecords);

        if (groupEventError) {
            console.error("Failed to share event with groups:", groupEventError);
        }
    }

    // Tag users as participants
    if (body.taggedUsers && body.taggedUsers.length > 0) {
        const taggedUserRecords = body.taggedUsers.map((userId) => ({
            user_id: userId,
            event_id: newEvent.id,
            relationship_type: "tagged" as const,
        }));

        const { error: taggedUserError } = await client
            .from("user-events")
            .insert(taggedUserRecords);

        if (taggedUserError) {
            console.error("Failed to tag users:", taggedUserError);
        }
    }

    // Share with specific users
    if (body.shareWithUsers && body.shareWithUsers.length > 0) {
        const sharedUserRecords = body.shareWithUsers.map((userId) => ({
            user_id: userId,
            event_id: newEvent.id,
            relationship_type: "shared" as const,
        }));

        const { error: sharedUserError } = await client
            .from("user-events")
            .insert(sharedUserRecords);

        if (sharedUserError) {
            console.error("Failed to share event with users:", sharedUserError);
        }
    }

    return newEvent;
});