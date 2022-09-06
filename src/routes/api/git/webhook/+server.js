import { handleWebhook } from '$lib/index';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    return handleWebhook(request)
}
