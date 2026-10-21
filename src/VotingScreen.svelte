<script lang="ts">
  import * as Y from "yjs";
  import { onDestroy } from "svelte";
  import {
    ydoc,
    ytitle,
    ydescription,
    yoptionTexts,
    yoptionOrder,
    yoptionVotes,
    ydotVotes,
    ypollViewers,
    yshowName,
    selfId,
    selfName,
    syncNow,
    logEdit,
    fieldCommit,
    orderedTextIds,
    createOption,
  } from "./yjs-sync";
  import { m } from "./paraglide/messages.js";
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
  import { autogrow, bindYText } from "./yjs-textarea";
  import { prefs } from "./prefs.svelte";
  import Turnout from "./Turnout.svelte";
  import { exportPollText, importPollText } from "./poll-text";

  interface Option {
    id: string;
    text: string;
  }

  interface Voter {
    name: string;
    anonymous: boolean;
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

  function addOption() {
    createOption();
    syncNow();
  }

  let importOpen = $state(false);
  let importText = $state("");
  let importFailed = $state(false);
  function toggleImport() {
    importOpen = !importOpen;
    importFailed = false;
  }

  const COPIED_NOTICE_MS = 4000;
  let exportCopied = $state(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  async function exportClick() {
    exportCopied = await exportPollText();
    clearTimeout(copiedTimer);
    if (exportCopied) {
      copiedTimer = setTimeout(() => (exportCopied = false), COPIED_NOTICE_MS);
    }
  }
  onDestroy(() => clearTimeout(copiedTimer));
  function submitImport() {
    importFailed = !importPollText(importText);
    if (importFailed) return;
    importOpen = false;
    importText = "";
  }

  function deleteOption(id: string) {
    ydoc.transact(() => {
      const index = yoptionOrder.toArray().indexOf(id);
      if (index !== -1) yoptionOrder.delete(index, 1);
      yoptionTexts.delete(id);
      yoptionVotes.delete(id);
      ydotVotes.delete(id);
    });
    syncNow();
  }

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

  let voteNames = $state<Record<string, Voter[]>>({});
  let myVotes = $state<Record<string, boolean>>({});
  let totalVoterCount = $state(0);
  let allVoters = $state<{ id: string; name: string }[]>([]);

  function syncVotes() {
    const names: Record<string, Voter[]> = {};
    const mine: Record<string, boolean> = {};
    const voterNames = new Map<string, string>();
    for (const id of orderedTextIds()) {
      const votes = yoptionVotes.get(id);
      names[id] = votes
        ? [...votes.keys()].map((voterId) => {
            const shown = yshowName.get(voterId) ?? true;
            return {
              name: shown ? votes.get(voterId)! : "🥷",
              anonymous: !shown,
            };
          })
        : [];
      mine[id] = votes?.has(selfId) ?? false;
      if (votes)
        for (const [voterId, name] of votes) voterNames.set(voterId, name);
    }
    voteNames = names;
    myVotes = mine;
    totalVoterCount = voterNames.size;
    allVoters = [...voterNames].map(([id, name]) => ({ id, name }));
  }

  syncVotes();

  yoptionOrder.observe(syncOptions);
  yoptionTexts.observeDeep(syncOptions);
  yshowName.observe(syncShowMyName);
  yoptionVotes.observeDeep(syncVotes);
  yoptionOrder.observe(syncVotes);
  yshowName.observe(syncVotes);
  onDestroy(() => {
    yoptionOrder.unobserve(syncOptions);
    yoptionTexts.unobserveDeep(syncOptions);
    yshowName.unobserve(syncShowMyName);
    yoptionVotes.unobserveDeep(syncVotes);
    yoptionOrder.unobserve(syncVotes);
    yshowName.unobserve(syncVotes);
  });

  function voteCount(id: string): number {
    return voteNames[id]?.length ?? 0;
  }

  let displayOptions = $derived(
    prefs.showVotes
      ? [...options].sort((a, b) => voteCount(b.id) - voteCount(a.id))
      : options,
  );

  function votePercent(id: string): number {
    if (totalVoterCount === 0) return 0;
    return Math.round((voteCount(id) / totalVoterCount) * 100);
  }

  function toggleVote(id: string) {
    const votes = yoptionVotes.get(id);
    if (!votes) return;
    const optionLabel = optionYText(id).toString();
    ydoc.transact(() => {
      if (votes.has(selfId)) {
        votes.delete(selfId);
        logEdit({ kind: "deselect", optionLabel });
      } else {
        votes.set(selfId, selfName);
        logEdit({ kind: "select", optionLabel });
      }
    });
    syncNow();
  }

  const commitTitle = fieldCommit({ kind: "title" });
  const commitDescription = fieldCommit({ kind: "description" });
  const commitOption = fieldCommit({ kind: "option" });

  function handleOptionDrop(state: DragDropState<Option>) {
    const { draggedItem, targetContainer, dropPosition } = state;
    const order = yoptionOrder.toArray();
    const dragIndex = order.indexOf(draggedItem.id);
    let dropIndex = parseInt(targetContainer ?? "0");
    if (dropPosition === "after") dropIndex++;
    if (dragIndex === -1) return;
    const adjusted = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
    if (adjusted === dragIndex) return;
    ydoc.transact(() => {
      yoptionOrder.delete(dragIndex, 1);
      yoptionOrder.insert(adjusted, [draggedItem.id]);
    });
    syncNow();
  }
</script>

<div class="flex flex-row items-center gap-2 px-4 pt-2">
  <textarea
    class="grow resize-none overflow-hidden text-xl font-bold wrap-break-word whitespace-pre-wrap rounded-sm outline-none focus:ring-2 focus:ring-emerald-600"
    rows="1"
    use:bindYText={{ yText: ytitle, onCommit: commitTitle }}
    use:autogrow
    placeholder={m.title_placeholder()}></textarea>
</div>

<div class="flex flex-row items-center gap-2 px-4">
  <textarea
    class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap rounded-sm outline-none focus:ring-2 focus:ring-emerald-600"
    rows="1"
    use:bindYText={{ yText: ydescription, onCommit: commitDescription }}
    use:autogrow
    placeholder={m.description_placeholder()}></textarea>
</div>

<div
  class="flex flex-row items-center justify-between px-4 text-base text-neutral-600 dark:text-neutral-400"
>
  <label
    class="flex flex-row items-baseline gap-2 font-bold text-black dark:text-neutral-200"
  >
    <input type="checkbox" bind:checked={prefs.showVotes} />
    {m.show_votes_label()}
  </label>
  <label class="flex flex-row items-baseline gap-2">
    <input
      type="checkbox"
      checked={showMyName}
      onchange={(event) => toggleShowMyName(event.currentTarget.checked)}
    />
    {m.show_my_name_label()}
  </label>
</div>

<Turnout yviewers={ypollViewers} voters={allVoters} />

<ul class="flex flex-col gap-3 px-2 pt-2">
  {#each displayOptions as option, index (option.id)}
    <li
      class="flex flex-col gap-1 rounded-md shadow-[0_0_8px_rgb(0_0_0/0.15)] dark:shadow-[0_0_10px_rgb(0_0_0)]"
      use:droppable={{
        container: index.toString(),
        callbacks: { onDrop: handleOptionDrop },
      }}
    >
      <div class="flex flex-row items-center">
        {#if !prefs.showVotes}
          <span
            class="option-drag-handle mt-1.5 ml-2 cursor-grab self-start text-neutral-400"
            use:draggable={{ container: index.toString(), dragData: option }}
          >
            <svg width="17" height="28" viewBox="-1.5 -1.5 12 18">
              <circle cx="1.5" cy="1.5" r="1.3" fill="currentColor" />
              <circle cx="7.5" cy="1.5" r="1.3" fill="currentColor" />
              <circle cx="1.5" cy="7.5" r="1.3" fill="currentColor" />
              <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" />
              <circle cx="1.5" cy="13.5" r="1.3" fill="currentColor" />
              <circle cx="7.5" cy="13.5" r="1.3" fill="currentColor" />
            </svg>
          </span>
          <button
            class="mt-1.5 ml-1 self-start"
            aria-label={myVotes[option.id]
              ? m.remove_vote_label()
              : m.vote_label()}
            onclick={() => toggleVote(option.id)}
          >
            {#if myVotes[option.id]}
              <svg
                class="text-emerald-700"
                width="28"
                height="28"
                viewBox="0 0 16 16"
              >
                <circle cx="8" cy="8" r="7" fill="currentColor" />
                <path
                  d="M5 8.5l2 2 4-5"
                  fill="none"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {:else}
              <svg
                class="text-neutral-300 dark:text-neutral-600"
                width="28"
                height="28"
                viewBox="0 0 16 16"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            {/if}
          </button>
        {/if}
        <textarea
          class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap rounded-sm pt-2 pl-2 outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-inset pb-2"
          rows="1"
          use:bindYText={{
            yText: optionYText(option.id),
            onCommit: commitOption,
          }}
          use:autogrow
          placeholder={m.option_placeholder()}></textarea>
        {#if option.text.trim() === ""}
          <button
            class="mt-2 self-start px-1"
            aria-label={m.delete_option_label()}
            onclick={() => deleteOption(option.id)}>🗑️</button
          >
        {/if}
      </div>
      {#if prefs.showVotes}
        <div
          class="mx-2 flex h-2.5 flex-row"
          role="progressbar"
          aria-label={option.text || m.option_result_bar_label()}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={votePercent(option.id)}
        >
          <div
            class="rounded-l-sm bg-emerald-700"
            class:rounded-r-sm={votePercent(option.id) === 100}
            style="flex-grow: {votePercent(option.id)}"
          ></div>
          <div
            class="rounded-r-sm bg-emerald-700/20 dark:bg-emerald-950"
            class:rounded-l-sm={votePercent(option.id) === 0}
            style="flex-grow: {100 - votePercent(option.id)}"
          ></div>
        </div>
        <div
          class="mb-2 mx-2 flex flex-row items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
        >
          <span class="grow">
            {#each voteNames[option.id] ?? [] as voter, i (i)}
              {#if i > 0}<span>, </span>{/if}
              {#if voter.anonymous}
                <span
                  class="inline-flex h-4 items-center justify-center overflow-hidden rounded-sm border border-neutral-300 bg-[#929292] px-1 leading-none"
                  >{voter.name}</span
                >
              {:else}
                <span>{voter.name}</span>
              {/if}
            {/each}
          </span>
          <span class="self-start whitespace-nowrap"
            >{voteCount(option.id)}/{totalVoterCount} ({votePercent(
              option.id,
            )}%)</span
          >
        </div>
      {/if}
    </li>
  {/each}
</ul>

<button
  class="mt-4 self-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
  onclick={addOption}
>
  ➕&nbsp;&nbsp;{m.add_option_label()}
</button>

<div
  class="flex flex-row items-center justify-center gap-2 px-4 text-sm text-neutral-600 dark:text-neutral-400"
>
  <button
    class="rounded-md border border-neutral-300 px-3 py-1 dark:border-neutral-600"
    onclick={toggleImport}
  >
    📥&nbsp;&nbsp;{m.import_poll_label()}
  </button>
  <button
    class="rounded-md border border-neutral-300 px-3 py-1 dark:border-neutral-600"
    onclick={exportClick}
  >
    📤&nbsp;&nbsp;{m.export_poll_label()}
  </button>
</div>
{#if exportCopied}
  <p
    class="px-4 text-center text-sm text-green-700 dark:text-green-400"
    role="status"
  >
    {m.export_poll_copied()}
  </p>
{/if}
{#if importOpen}
  <div class="flex flex-col gap-2 px-4">
    <textarea
      class="w-full resize-none rounded-sm border border-neutral-300 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600 dark:border-neutral-600"
      rows="5"
      placeholder={m.import_poll_placeholder()}
      bind:value={importText}></textarea>
    <button
      class="self-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      disabled={importText.trim() === ""}
      onclick={submitImport}
    >
      {m.import_poll_submit()}
    </button>
  </div>
{/if}
{#if importFailed}
  <p
    class="px-4 text-center text-sm text-red-600 dark:text-red-400"
    role="alert"
  >
    {m.import_poll_invalid()}
  </p>
{/if}
