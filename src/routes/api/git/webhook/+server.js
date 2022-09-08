import { handleWebhook, posts } from '$lib/index';
import { json } from '@sveltejs/kit';
import { get } from 'svelte/store';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    return handleWebhook(request)
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    return json({
        posts: await get(posts)
    })
}
