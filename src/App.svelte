<script lang="ts">
  import { m } from "./paraglide/messages.js";
  import HistoryScreen from "./HistoryScreen.svelte";
  import InfoScreen from "./InfoScreen.svelte";
  import VotingScreen from "./VotingScreen.svelte";
  import DotVotingScreen from "./DotVotingScreen.svelte";

  const THEME_KEY = "sondaggio-dark";

  let dark = $state(localStorage.getItem(THEME_KEY) !== "false");

  $effect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, String(dark));
  });

  const INFO_SEEN_KEY = "sondaggio-info-seen";
  const infoSeen = localStorage.getItem(INFO_SEEN_KEY) === "true";
  if (!infoSeen) localStorage.setItem(INFO_SEEN_KEY, "true");

  type View = "poll" | "dots" | "history" | "info";
  let view = $state<View>(infoSeen ? "poll" : "info");

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
    view = tabs[next].id;
    tabEls[next]?.focus();
  }
</script>

<main
  class="flex min-h-screen flex-col gap-2 bg-white text-black dark:bg-neutral-800 dark:text-neutral-100 py-2"
>
  <div class="flex flex-row items-center gap-2 px-4">
    <img src="icon.svg" alt="" class="h-6 w-6 mb-1" />
    <span class="grow font-bold">{m.app_name()}</span>
    <div role="tablist" aria-label={m.tabs_label()} class="flex flex-row gap-2">
      {#each tabs as tab, i (tab.id)}
        <button
          bind:this={tabEls[i]}
          role="tab"
          class="border-b-4 px-1 text-sm {view === tab.id
            ? 'border-blue-500 bg-blue-100 dark:bg-blue-900'
            : 'border-transparent'}"
          aria-selected={view === tab.id}
          aria-label={tab.label()}
          tabindex={view === tab.id ? 0 : -1}
          onclick={() => (view = tab.id)}
          onkeydown={(event) => onTabKey(event, i)}
        >
          {tab.icon}
        </button>
      {/each}
    </div>
    <button
      class="text-sm"
      aria-label={m.theme_toggle_label()}
      onclick={() => (dark = !dark)}
    >
      {dark ? "🌙" : "☀️"}
    </button>
  </div>

  {#if view === "history"}
    <HistoryScreen />
  {:else if view === "info"}
    <InfoScreen />
  {:else if view === "dots"}
    <DotVotingScreen />
  {:else}
    <VotingScreen />
  {/if}
</main>
