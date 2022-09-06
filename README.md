# Svelte Git CMS

- It uses Github issues as a CMS
- All issues and labels are only pulled once when your website is visited first time after being deployed.
- Anytime you create or update a issue or label it get's synced using github webhook
- All subsequent visits to your website uses the data stored in server side store

1) Install the package in your sveltekit app
    
        npm i -D svelte-git-cms


2) Create `src/hooks.js` with following content

    ```js
    import { githubSync } from 'svelte-git-cms'

    /** @type {import('@sveltejs/kit').Handle} */
    export async function handle({ event, resolve }) {
        await githubSync({
            github_repo: 'ak4zh/svelte-git-cms', // your github repo
            github_token: process.env.GITHUB_TOKEN // your github token
        })
        const response = await resolve(event);
        return response;
    }
    ```

3) Create an webhook route for github, so github can inform your app when issues or labels change.
    
    a) Create webhook endpoint `src/routes/api/git/webhook/+server.js`

    ```js
    import { handleWebhook } from 'svelte-git-cms';

    /** @type {import('./$types').RequestHandler} */
    export async function POST({ request }) {
        return handleWebhook(request)
    }
    ```

    b) Go to your github repo `Settings > Webhooks > Add webhook` and create a new webhook with following config:
        
    - **Payload URL** `https://YOUR_PRODUCTION_DOMAIN/api/git/webhook`
    - **Content type** `application/json`
    - **Events** Select `Issues` and `Labels`


4) Create `+page.server.js` in the route you want to show the posts / labels.
    
    a) `src/routes/+page.server.js`

    ```js
    import { labels, posts } from 'svelte-git-cms';
    import { get } from 'svelte/store';
    
    /** @type {import('./$types').PageServerLoad} */
    export async function load({ params }) {    
        return {
            posts: get(posts),
            labels: get(labels)
        }
    }
    ```

    b) `src/routes/+page.svelte`

    ```html
    <script>
        /** @type {import('./$types').PageServerData} */
        export let data;
    </script>

    <ul>
        {#each Object.keys(data.labels) as label}
            <li>{label}</li>
        {/each}
    </ul>

    {#if Object.keys(data.posts).length}
        <ul>
            {#each Object.entries(data.posts) as [slug, post]}
            <li>    
                /{slug}
                {post.title}
                {post.body}
            </li>
            {/each}
        </ul>

    {:else}
        No posts
    {/if}
    ```

## Notes

- If everything is setup correctly any new issue you create with label `+page` will be instantly available on your webiste. (can be customized by setting env `GITHUB_LABEL_PUBLISHED`)
- You can also attach more labels on the issue which will be available as `tags` property in the `post` object. (label set in `GITHUB_LABEL_PUBLISHED` won't be available in tags, as this label is used tpo determine which issue should appear as post on the website)
- All labels must have a prefix `+` example `+Idea`, `+Personal` etc, prefix will be removed when converted to post tags.
- If you do not like the `+` prefix you can change it by setting environmanet variable `GITHUB_LABEL_PREFIX` to any other character or leave it empty for no prefix.


## Inspiration

The idea of using github as CMS is inspired from [swyxkit](https://github.com/sw-yx/swyxkit)