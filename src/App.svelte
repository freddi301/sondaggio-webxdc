<script lang="ts">
  import { m } from "./paraglide/messages.js";
  import pkg from "../package.json";
  import HistoryScreen from "./HistoryScreen.svelte";
  import InfoScreen from "./InfoScreen.svelte";
  import VotingScreen from "./VotingScreen.svelte";
  import DotVotingScreen from "./DotVotingScreen.svelte";
  import { prefs, type View } from "./prefs.svelte";

  const tabs: { id: View; icon: string; label: () => string }[] = [
    { id: "info", icon: "ℹ️", label: () => m.info_view_button() },
    { id: "poll", icon: "🗳️", label: () => m.poll_view_button() },
    { id: "dots", icon: "🪙", label: () => m.dotvoting_view_button() },
    { id: "history", icon: "⏳", label: () => m.history_view_button() },
  ];

  let tabEls = $state<HTMLButtonElement[]>([]);
  function onTabKey(event: KeyboardEvent, i: number) {
    const to = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const next = (to + tabs.length) % tabs.length;
    prefs.view = tabs[next].id;
    tabEls[next]?.focus();
  }
</script>

<main
  class="flex min-h-screen flex-col gap-2 bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 pb-2"
>
  <div class="flex flex-row items-center gap-2 px-4">
    <img src="icon.svg" alt="" class="h-6 w-6 mb-1 my-1" />
    <span class="grow font-bold my-1 text-neutral-500 dark:text-neutral-400"
      >{m.app_name()}<span
        class="ml-1 text-xs font-normal text-neutral-500 dark:text-neutral-400"
        >v{pkg.version}</span
      ></span
    >
    <div role="tablist" aria-label={m.tabs_label()} class="flex flex-row gap-2">
      {#each tabs as tab, i (tab.id)}
        <button
          bind:this={tabEls[i]}
          id="tab-{tab.id}"
          role="tab"
          class="border-b-4 px-2 text-sm py-1 {prefs.view === tab.id
            ? 'border-blue-500 bg-blue-100 dark:bg-blue-900'
            : 'border-transparent'}"
          aria-selected={prefs.view === tab.id}
          aria-controls="tabpanel"
          aria-label={tab.label()}
          tabindex={prefs.view === tab.id ? 0 : -1}
          onclick={() => (prefs.view = tab.id)}
          onkeydown={(event) => onTabKey(event, i)}
        >
          {tab.icon}
        </button>
      {/each}
    </div>
    <button
      class="text-sm"
      aria-label={m.theme_toggle_label()}
      onclick={() => (prefs.dark = !prefs.dark)}
    >
      {prefs.dark ? "🌙" : "☀️"}
    </button>
  </div>

  <div
    id="tabpanel"
    role="tabpanel"
    aria-labelledby="tab-{prefs.view}"
    class="flex flex-col gap-2"
  >
    {#if prefs.view === "history"}
      <HistoryScreen />
    {:else if prefs.view === "info"}
      <InfoScreen />
    {:else if prefs.view === "dots"}
      <DotVotingScreen />
    {:else}
      <VotingScreen />
    {/if}
  </div>
</main>
