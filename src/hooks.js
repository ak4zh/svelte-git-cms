import { githubSync } from '$lib/index'

let github_repo = 'sw-yx/swyxkit'
let github_token = process.env.GITHUB_TOKEN
console.log(github_token)
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    await githubSync({github_repo, github_token, label_prefix: '', label_published: 'Published'})
    const response = await resolve(event);
    return response;
}
