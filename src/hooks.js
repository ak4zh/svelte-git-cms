import { githubSync } from '$lib/index'

let github_repo = 'ak4zh/svelte-git-cms'
let github_token = process.env.GITHUB_TOKEN

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    await githubSync({github_repo, github_token})
    const response = await resolve(event);
    return response;
}
