<script lang="ts">
  import * as Y from "yjs";
  import { yshowName, markViewer } from "./yjs-sync";
  import { prefs } from "./prefs.svelte";
  import { m } from "./paraglide/messages.js";

  interface Person {
    id: string;
    name: string;
  }

  let { yviewers, voters }: { yviewers: Y.Map<string>; voters: Person[] } =
    $props();

  let viewerEntries = $state<Person[]>([]);

  $effect(() => {
    function syncViewers() {
      viewerEntries = [...yviewers.entries()].map(([id, name]) => ({
        id,
        name,
      }));
    }
    syncViewers();
    yviewers.observe(syncViewers);
    yshowName.observe(syncViewers);
    return () => {
      yviewers.unobserve(syncViewers);
      yshowName.unobserve(syncViewers);
    };
  });

  $effect(() => {
    const timer = setTimeout(() => markViewer(yviewers), 2000);
    return () => clearTimeout(timer);
  });

  let voterIds = $derived(new Set(voters.map((v) => v.id)));
  let viewerOnly = $derived(viewerEntries.filter((v) => !voterIds.has(v.id)));
  let totalViewers = $derived(
    new Set([...voters.map((v) => v.id), ...viewerEntries.map((v) => v.id)])
      .size,
  );

  let percent = $derived.by(() => {
    const denom = Math.max(totalViewers, voters.length);
    return denom === 0 ? 0 : Math.round((voters.length / denom) * 100);
  });

  function displayName(id: string, name: string): string {
    return (yshowName.get(id) ?? true) ? name : "🥷";
  }

  function isAnonymous(id: string): boolean {
    return !(yshowName.get(id) ?? true);
  }
</script>

<div
  class="flex flex-row items-center gap-2 px-4"
  style:visibility={prefs.showVotes ? "visible" : "hidden"}
>
  <span class="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400"
    >✅ {voters.length}</span
  >
  <div
    class="flex h-2.5 grow flex-row"
    role="progressbar"
    aria-label={m.turnout_bar_label()}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={percent}
  >
    <div
      class="rounded-l-full bg-blue-500"
      class:rounded-r-full={percent === 100}
      style="flex-grow: {percent}"
    ></div>
    <div
      class="rounded-r-full bg-blue-200 dark:bg-blue-950"
      class:rounded-l-full={percent === 0}
      style="flex-grow: {100 - percent}"
    ></div>
  </div>
  <span class="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400"
    >{totalViewers} 👁️</span
  >
</div>

<div
  class="flex min-h-5 flex-row items-center gap-2 px-4 text-sm text-neutral-600 dark:text-neutral-400"
  style:visibility={prefs.showVotes ? "visible" : "hidden"}
>
  <span class="grow">
    {#each voters as voter, i (voter.id)}
      {#if i > 0}<span>, </span>{/if}
      {#if isAnonymous(voter.id)}
        <span
          class="inline-flex h-4 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-[#929292] px-1 leading-none"
          >🥷</span
        >
      {:else}
        <span>{displayName(voter.id, voter.name)}</span>
      {/if}
    {/each}
    {#each viewerOnly as viewer, i (viewer.id)}
      {#if voters.length > 0 || i > 0}<span>, </span>{/if}
      <span class="line-through">
        {#if isAnonymous(viewer.id)}
          <span
            class="inline-flex h-4 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-[#929292] px-1 leading-none"
            >🥷</span
          >
        {:else}
          {displayName(viewer.id, viewer.name)}
        {/if}
      </span>
    {/each}
  </span>
</div>
