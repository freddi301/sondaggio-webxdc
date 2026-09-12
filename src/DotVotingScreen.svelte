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
    ydotViewers,
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
  import Turnout from "./Turnout.svelte";

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

  let optionVoters = $state<Record<string, DotVoter[]>>({});
  let optionTokens = $state<Record<string, number>>({});
  let maxOptionTokens = $state(0);
  let myTokens = $state<Record<string, number>>({});
  let myTokensUsed = $state(0);
  let allVoters = $state<{ id: string; name: string }[]>([]);

  function syncDots() {
    const voters: Record<string, DotVoter[]> = {};
    const totals: Record<string, number> = {};
    const mine: Record<string, number> = {};
    const voterNames = new Map<string, string>();
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
          voterNames.set(voterId, entry.name);
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
    allVoters = [...voterNames].map(([id, name]) => ({ id, name }));
  }

  syncDots();

  yoptionOrder.observe(syncOptions);
  yoptionTexts.observeDeep(syncOptions);
  ydotVotes.observeDeep(syncDots);
  yoptionOrder.observe(syncDots);
  yshowName.observe(syncDots);
  onDestroy(() => {
    yoptionOrder.unobserve(syncOptions);
    yoptionTexts.unobserveDeep(syncOptions);
    ydotVotes.unobserveDeep(syncDots);
    yoptionOrder.unobserve(syncDots);
    yshowName.unobserve(syncDots);
  });

  let dotsRemaining = $derived(
    Math.max(0, Math.min(DOT_BUDGET, DOT_BUDGET - myTokensUsed)),
  );

  let displayOptions = $derived(
    prefs.showVotes
      ? [...options].sort(
          (a, b) => (optionTokens[b.id] ?? 0) - (optionTokens[a.id] ?? 0),
        )
      : options,
  );

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
    if (dotsRemaining <= 0) return;
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
  class="flex flex-row items-center justify-between px-4 text-base text-neutral-600 dark:text-neutral-400"
>
  <label
    class="flex flex-row items-baseline gap-2 font-bold text-black dark:text-neutral-100"
  >
    <input type="checkbox" bind:checked={prefs.showVotes} />
    {m.show_votes_label()}
  </label>
  <span
    class="whitespace-nowrap font-bold {dotsRemaining === 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-orange-600 dark:text-orange-400'}"
  >
    {dotsRemaining === 0 ? "✅" : "⚠️"}
    {m.dots_available()}
    {dotsRemaining}/{DOT_BUDGET} 🪙
  </span>
</div>

<Turnout yviewers={ydotViewers} voters={allVoters} />

{#if options.length === 0}
  <p class="px-4 pt-2 text-sm text-neutral-500 dark:text-neutral-400">
    {m.dots_no_options()}
  </p>
{:else}
  <ul class="flex flex-col gap-4 pt-2">
    {#each displayOptions as option (option.id)}
      <li class="flex flex-col gap-1 pl-2 {prefs.showVotes ? 'pr-2' : ''}">
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
          {#if !prefs.showVotes}
            <div
              class="flex flex-row items-center leading-none"
              role="group"
              aria-label={option.text || m.option_placeholder()}
            >
              <button
                class="px-3 py-2 text-xl disabled:opacity-30"
                aria-label={m.remove_dot_label()}
                onclick={() => removeToken(option.id)}
                disabled={(myTokens[option.id] ?? 0) <= 0}>▼</button
              >
              <span class="text-sm tabular-nums -mx-1" aria-live="polite"
                >{myTokens[option.id] ?? 0}</span
              >
              <button
                class="px-3 py-2 text-xl disabled:opacity-30"
                aria-label={m.add_dot_label()}
                onclick={() => addToken(option.id)}
                disabled={dotsRemaining <= 0}>▲</button
              >
            </div>
          {/if}
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
                  class="inline-flex h-4 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-[#929292] px-1 leading-none"
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
