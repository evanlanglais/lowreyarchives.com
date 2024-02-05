import { serverSupabaseClient } from '#supabase/server'
import { serverSupabaseUser } from '#supabase/server'
import { Database, Tables } from '~/types/supabase';

export default defineEventHandler(async (event) => {
    // const user = await serverSupabaseUser(event)
    //
    // if (!user)
    // {
    //     throw createError({
    //         statusCode: 401,
    //         statusMessage: 'User not authenticated!',
    //     })
    // }
    //
    // const client = await serverSupabaseClient(event)
    //
    // const { data, error } = await client.from('events').select(`...groups (*)`).eq('user_id', user.id).returns<Array<Tables<'groups'>>>();
    // if (error) throw createError({
    //     statusCode: 500,
    //     statusMessage: 'User not authenticated!',
    // })
    //
    // return data;
})