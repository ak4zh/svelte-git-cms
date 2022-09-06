import { writable } from "svelte/store";

/** @type {import('svelte/store').Writable<import('./types').Posts>} */
export const posts = writable({})
/** @type {import('svelte/store').Writable<import('./types').PostLabels>} */
export const labels = writable({})
/** @type {import('svelte/store').Writable<boolean>} */
export const synced = writable(false)


