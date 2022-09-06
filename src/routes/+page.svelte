<script>
    /** @type {import('./$types').PageServerData} */
    export let data;
</script>

<ul>
    {#each Object.entries(data.labels) as [labelName, labelData]}
        <li style="background-color: #{labelData.color};">{labelName}</li>
    {/each}
</ul>

{#if Object.keys(data.posts).length}
    <ul>
        {#each Object.entries(data.posts) as [slug, post]}
        <li>
            <b>{post.reading_time}</b>
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

