<script lang="ts">
  import * as Y from "yjs";
  import { onDestroy } from "svelte";
  import {
    ydoc,
    ytitle,
    ydescription,
    yoptionTexts,
    yoptionOrder,
    ydotVotes,
    DOT_BUDGET,
    yopeners,
    yshowName,
    selfId,
    selfName,
    syncNow,
    logEdit,
    fieldCommit,
    orderedTextIds,
    type DotVote,
  } from "./yjs-sync";
  import { m } from "./paraglide/messages.js";
  import { autogrow, bindYText } from "./yjs-textarea";
  import { prefs } from "./prefs.svelte";

  interface Option {
    id: string;
    text: string;
  }

  interface DotVoter {
    name: string;
    anonymous: boolean;
    tokens: number;
  }

  function optionYText(id: string): Y.Text {
    const ytext = yoptionTexts.get(id);
    if (!ytext) throw new Error(`missing Y.Text for option ${id}`);
    return ytext;
  }

  function readOptions(): Option[] {
    return orderedTextIds().map((id) => ({
      id,
      text: yoptionTexts.get(id)?.toString() ?? "",
    }));
  }

  let options = $state<Option[]>(readOptions());

  function syncOptions() {
    options = orderedTextIds().map((id) => {
      const text = yoptionTexts.get(id)?.toString() ?? "";
      const existing = options.find((option) => option.id === id);
      return existing && existing.text === text ? existing : { id, text };
    });
  }

  let totalOpenedCount = $state(yopeners.size);
  function syncOpened() {
    totalOpenedCount = yopeners.size;
  }

  // Local-only, resets to false on every launch — not persisted, not synced.
  let sortByDots = $state(false);

  let showMyName = $state(yshowName.get(selfId) ?? true);
  function syncShowMyName() {
    showMyName = yshowName.get(selfId) ?? true;
  }

  function toggleShowMyName(checked: boolean) {
    ydoc.transact(() => {
      yshowName.set(selfId, checked);
    });
    syncNow();
  }

  let optionVoters = $state<Record<string, DotVoter[]>>({});
  let optionTokens = $state<Record<string, number>>({});
  let maxOptionTokens = $state(0);
  let myTokens = $state<Record<string, number>>({});
  let myTokensUsed = $state(0);
  let dotVoterCount = $state(0);

  function syncDots() {
    const voters: Record<string, DotVoter[]> = {};
    const totals: Record<string, number> = {};
    const mine: Record<string, number> = {};
    const distinct = new Set<string>();
    let max = 0;
    let used = 0;
    for (const id of orderedTextIds()) {
      const dv = ydotVotes.get(id);
      const list: DotVoter[] = [];
      let total = 0;
      if (dv) {
        for (const voterId of dv.keys()) {
          const entry = dv.get(voterId);
          if (!entry || entry.count <= 0) continue;
          const shown = yshowName.get(voterId) ?? true;
          list.push({
            name: shown ? entry.name : "🥷",
            anonymous: !shown,
            tokens: entry.count,
          });
          total += entry.count;
          distinct.add(voterId);
          if (voterId === selfId) {
            mine[id] = entry.count;
            used += entry.count;
          }
        }
      }
      voters[id] = list;
      totals[id] = total;
      if (total > max) max = total;
    }
    optionVoters = voters;
    optionTokens = totals;
    maxOptionTokens = max;
    myTokens = mine;
    myTokensUsed = used;
    dotVoterCount = distinct.size;
  }

  syncDots();

  yoptionOrder.observe(syncOptions);
  yoptionTexts.observeDeep(syncOptions);
  yopeners.observe(syncOpened);
  yshowName.observe(syncShowMyName);
  ydotVotes.observeDeep(syncDots);
  yoptionOrder.observe(syncDots);
  yshowName.observe(syncDots);
  onDestroy(() => {
    yoptionOrder.unobserve(syncOptions);
    yoptionTexts.unobserveDeep(syncOptions);
    yopeners.unobserve(syncOpened);
    yshowName.unobserve(syncShowMyName);
    ydotVotes.unobserveDeep(syncDots);
    yoptionOrder.unobserve(syncDots);
    yshowName.unobserve(syncDots);
  });

  let dotsRemaining = $derived(
    Math.max(0, Math.min(DOT_BUDGET, DOT_BUDGET - myTokensUsed)),
  );

  let displayOptions = $derived(
    sortByDots
      ? [...options].sort(
          (a, b) => (optionTokens[b.id] ?? 0) - (optionTokens[a.id] ?? 0),
        )
      : options,
  );

  let openedVotePercent = $derived.by(() => {
    const denom = Math.max(totalOpenedCount, dotVoterCount);
    return denom === 0 ? 0 : Math.round((dotVoterCount / denom) * 100);
  });

  function optionFillPercent(id: string): number {
    if (maxOptionTokens === 0) return 0;
    return Math.round(((optionTokens[id] ?? 0) / maxOptionTokens) * 100);
  }

  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  function debouncedSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = undefined;
      syncNow();
    }, 800);
  }
  onDestroy(() => {
    if (syncTimer !== undefined) {
      clearTimeout(syncTimer);
      syncNow();
    }
  });

  function addToken(id: string) {
    if (sortByDots || dotsRemaining <= 0) return;
    const optionLabel = optionYText(id).toString();
    ydoc.transact(() => {
      let dv = ydotVotes.get(id);
      if (!dv) {
        dv = new Y.Map<DotVote>();
        ydotVotes.set(id, dv);
      }
      const current = dv.get(selfId)?.count ?? 0;
      dv.set(selfId, { name: selfName, count: current + 1 });
      logEdit({ kind: "dot_inc", optionLabel });
    });
    debouncedSync();
  }

  function removeToken(id: string) {
    if (sortByDots) return;
    const dv = ydotVotes.get(id);
    if (!dv) return;
    const current = dv.get(selfId)?.count ?? 0;
    if (current <= 0) return;
    const optionLabel = optionYText(id).toString();
    ydoc.transact(() => {
      if (current - 1 <= 0) dv.delete(selfId);
      else dv.set(selfId, { name: selfName, count: current - 1 });
      logEdit({ kind: "dot_dec", optionLabel });
    });
    debouncedSync();
  }

  const commitTitle = fieldCommit({ kind: "title" });
  const commitDescription = fieldCommit({ kind: "description" });
  const commitOption = fieldCommit({ kind: "option" });
</script>

<div class="flex flex-row items-center gap-2 px-4">
  <textarea
    class="grow resize-none overflow-hidden text-xl font-bold wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
    rows="1"
    use:bindYText={{ yText: ytitle, onCommit: commitTitle }}
    use:autogrow
    placeholder={m.title_placeholder()}></textarea>
</div>

<div class="flex flex-row items-center gap-2 px-4">
  <textarea
    class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
    rows="1"
    use:bindYText={{ yText: ydescription, onCommit: commitDescription }}
    use:autogrow
    placeholder={m.description_placeholder()}></textarea>
</div>

<div
  class="flex flex-row items-center justify-between px-4 text-sm text-neutral-600 dark:text-neutral-400"
>
  <label class="flex flex-row items-center gap-1">
    <input type="checkbox" bind:checked={sortByDots} />
    {m.dots_sort_label()}
  </label>
  <span class="whitespace-nowrap">
    {m.dots_available()}
    {dotsRemaining}/{DOT_BUDGET} 🪙
  </span>
</div>

<div
  class="flex flex-row items-center justify-between px-4 text-sm text-neutral-600 dark:text-neutral-400"
>
  <label class="flex flex-row items-center gap-1">
    <input type="checkbox" bind:checked={prefs.showVotes} />
    {m.show_votes_label()}
  </label>
  <label class="flex flex-row items-center gap-1">
    <input
      type="checkbox"
      checked={showMyName}
      onchange={(event) => toggleShowMyName(event.currentTarget.checked)}
    />
    {m.show_my_name_label()}
  </label>
</div>

<div
  class="flex flex-row items-center gap-2 px-4"
  style:visibility={prefs.showVotes ? "visible" : "hidden"}
>
  <span class="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400"
    >✅ {dotVoterCount}</span
  >
  <div
    class="flex h-2.5 grow flex-row"
    role="progressbar"
    aria-label={m.turnout_bar_label()}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={openedVotePercent}
  >
    <div
      class="rounded-l-full bg-blue-500"
      class:rounded-r-full={openedVotePercent === 100}
      style="flex-grow: {openedVotePercent}"
    ></div>
    <div
      class="rounded-r-full bg-blue-200 dark:bg-blue-950"
      class:rounded-l-full={openedVotePercent === 0}
      style="flex-grow: {100 - openedVotePercent}"
    ></div>
  </div>
  <span class="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400"
    >{totalOpenedCount} 👁️</span
  >
</div>

{#if options.length === 0}
  <p class="px-4 pt-2 text-sm text-neutral-500 dark:text-neutral-400">
    {m.dots_no_options()}
  </p>
{:else}
  <ul class="flex flex-col gap-4 pt-2">
    {#each displayOptions as option (option.id)}
      <li class="flex flex-col gap-1 pl-2">
        <div class="flex flex-row items-center gap-1">
          <textarea
            class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
            rows="1"
            use:bindYText={{
              yText: optionYText(option.id),
              onCommit: commitOption,
            }}
            use:autogrow
            placeholder={m.option_placeholder()}></textarea>
          <div
            class="flex flex-row items-center leading-none"
            role="group"
            aria-label={option.text || m.option_placeholder()}
          >
            <button
              class="px-3 py-2 text-xl disabled:opacity-30"
              aria-label={m.remove_dot_label()}
              onclick={() => removeToken(option.id)}
              disabled={sortByDots || (myTokens[option.id] ?? 0) <= 0}>▼</button
            >
            <span class="text-sm tabular-nums -mx-1" aria-live="polite"
              >{myTokens[option.id] ?? 0}</span
            >
            <button
              class="px-3 py-2 text-xl disabled:opacity-30"
              aria-label={m.add_dot_label()}
              onclick={() => addToken(option.id)}
              disabled={sortByDots || dotsRemaining <= 0}>▲</button
            >
          </div>
        </div>
        <div
          class="flex h-2.5 flex-row"
          style:visibility={prefs.showVotes ? "visible" : "hidden"}
          role="progressbar"
          aria-label={option.text || m.option_result_bar_label()}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={optionFillPercent(option.id)}
          aria-valuetext="{optionTokens[option.id] ?? 0} 🪙"
        >
          <div
            class="rounded-l-full bg-blue-500"
            class:rounded-r-full={optionFillPercent(option.id) === 100}
            style="flex-grow: {optionFillPercent(option.id)}"
          ></div>
          <div
            class="rounded-r-full bg-blue-200 dark:bg-blue-950"
            class:rounded-l-full={optionFillPercent(option.id) === 0}
            style="flex-grow: {100 - optionFillPercent(option.id)}"
          ></div>
        </div>
        <div
          class="flex flex-row items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
          style:visibility={prefs.showVotes ? "visible" : "hidden"}
        >
          <span class="grow">
            {#each optionVoters[option.id] ?? [] as voter, i (i)}
              {#if i > 0}<span>, </span>{/if}
              {#if voter.anonymous}
                <span
                  class="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-[#929292] px-1"
                  >{voter.name}</span
                >
              {:else}
                <span>{voter.name}</span>
              {/if}
              <span class="font-bold text-amber-600 dark:text-amber-400"
                >{voter.tokens}</span
              >
            {/each}
          </span>
          <span class="self-start whitespace-nowrap"
            >{optionTokens[option.id] ?? 0}</span
          >
        </div>
      </li>
    {/each}
  </ul>
{/if}
