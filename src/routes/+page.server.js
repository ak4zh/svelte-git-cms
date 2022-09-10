import { env } from '$env/dynamic/public'
import { getCmsData } from '$lib/index'
import { dev } from '$app/environment';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, url }) {
    let repo = env.PUBLIC_GITHUB_REPO || 'ak4zh/svelte-git-cms'
    let host = url.host.split('.')
    if (!dev && host.length === 3 && host[0] !== 'www') {
        repo = host[0].replace('--', '/')
    }
    const {posts, labels} = await getCmsData(repo)
    return {
        posts,
        labels
    }
}