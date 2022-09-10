<script>
    /** @type {import('./$types').PageServerData} */
    export let data
</script>

<ul>
    {#each data.labels as label}
        <li style="background-color: #{label.color};">{label.name}</li>
    {/each}
</ul>

{#if Object.keys(data.posts).length}
    <ul>
        {#each data.posts as post}
        <li>
            <b>{post.reading_time}</b>
            /{post.front_matter.slug}
            {post.title}
            {@html post.body}
            <p>{post.tags}</p>
        </li>
        {/each}
    </ul>

{:else}
    No posts
{/if}

