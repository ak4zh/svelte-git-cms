import { labels, posts } from '$lib/index';
import { get } from 'svelte/store';
 
/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {    
    return {
        posts: get(posts),
        labels: get(labels)
    }
}