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
            <p>{post.tags}</p>
        </li>
        {/each}
    </ul>

{:else}
    No posts
{/if}

