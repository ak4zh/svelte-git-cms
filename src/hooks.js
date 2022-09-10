import { githubSync } from '$lib/index'
import { env as privateEnv } from '$env/dynamic/private'
import { env } from '$env/dynamic/public'
import { dev } from '$app/environment'

let githubConfig = {
    github_repo: env.PUBLIC_GITHUB_REPO || 'ak4zh/svelte-git-cms',
    github_token: privateEnv.GITHUB_TOKEN,
    label_prefix: env.PUBLIC_LABEL_PREFIX || '',
    label_published: env.PUBLIC_LABEL_PUBLISHED || ''
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    let host = event.url.host.split('.')
    if (!dev && host.length === 3 && host[0] !== 'www') {
        githubConfig.github_repo = host[0].replace('--', '/')
    }
    await githubSync(githubConfig)
    const response = await resolve(event);
    return response;
}
