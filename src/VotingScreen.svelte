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
    type DotVote,
    yopeners,
    yshowName,
    selfId,
    selfName,
    syncNow,
    logEdit,
  } from "./yjs-sync";
  import { m } from "./paraglide/messages.js";
  import { draggable, droppable, type DragDropState } from "@thisux/sveltednd";
  import { bindYText } from "./yjs-textarea";

  interface Option {
    id: string;
    text: string;
  }

  interface Voter {
    name: string;
    anonymous: boolean;
  }

  // Grows the textarea's height to fit its content, re-measuring on every
  // native 'input' event — including synthetic ones that bindYText dispatches
  // after applying a remote change, so it stays in sync without knowing
  // anything about Yjs.
  function autogrow(node: HTMLTextAreaElement) {
    function resize() {
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    }
    resize();
    node.addEventListener("input", resize);
    return {
      destroy() {
        node.removeEventListener("input", resize);
      },
    };
  }

  function optionYText(id: string): Y.Text {
    const ytext = yoptionTexts.get(id);
    if (!ytext) throw new Error(`missing Y.Text for option ${id}`);
    return ytext;
  }

  function orderedTextIds(): string[] {
    return yoptionOrder.toArray().filter((id) => yoptionTexts.has(id));
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
    const id = crypto.randomUUID();
    ydoc.transact(() => {
      yoptionTexts.set(id, new Y.Text());
      yoptionVotes.set(id, new Y.Map<string>());
      ydotVotes.set(id, new Y.Map<DotVote>());
      yoptionOrder.push([id]);
    });
    syncNow();
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

  let totalOpenedCount = $state(yopeners.size);
  function syncOpened() {
    totalOpenedCount = yopeners.size;
  }

  let showVotes = $state(false);

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

  function syncVotes() {
    const names: Record<string, Voter[]> = {};
    const mine: Record<string, boolean> = {};
    const voters = new Set<string>();
    for (const id of yoptionOrder.toArray()) {
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
      if (votes) for (const voter of votes.keys()) voters.add(voter);
    }
    voteNames = names;
    myVotes = mine;
    totalVoterCount = voters.size;
  }

  syncVotes();

  yoptionOrder.observe(syncOptions);
  yoptionTexts.observeDeep(syncOptions);
  yopeners.observe(syncOpened);
  yshowName.observe(syncShowMyName);
  yoptionVotes.observeDeep(syncVotes);
  yoptionOrder.observe(syncVotes);
  yshowName.observe(syncVotes);
  onDestroy(() => {
    yoptionOrder.unobserve(syncOptions);
    yoptionTexts.unobserveDeep(syncOptions);
    yopeners.unobserve(syncOpened);
    yshowName.unobserve(syncShowMyName);
    yoptionVotes.unobserveDeep(syncVotes);
    yoptionOrder.unobserve(syncVotes);
    yshowName.unobserve(syncVotes);
  });

  let openedVotePercent = $derived.by(() => {
    const denom = Math.max(totalOpenedCount, totalVoterCount);
    return denom === 0 ? 0 : Math.round((totalVoterCount / denom) * 100);
  });

  function voteCount(id: string): number {
    return voteNames[id]?.length ?? 0;
  }

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

  function commitTitleEdit(oldValue: string, newValue: string) {
    logEdit({ kind: "edit", field: { kind: "title" }, oldValue, newValue });
    syncNow();
  }

  function commitDescriptionEdit(oldValue: string, newValue: string) {
    logEdit({
      kind: "edit",
      field: { kind: "description" },
      oldValue,
      newValue,
    });
    syncNow();
  }

  function commitOptionEdit(oldValue: string, newValue: string) {
    logEdit({ kind: "edit", field: { kind: "option" }, oldValue, newValue });
    syncNow();
  }

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

<div class="flex flex-row items-center gap-2 px-4">
  <textarea
    class="grow resize-none overflow-hidden text-xl font-bold wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
    rows="1"
    use:bindYText={{ yText: ytitle, onCommit: commitTitleEdit }}
    use:autogrow
    placeholder={m.title_placeholder()}></textarea>
</div>

<div class="flex flex-row items-center gap-2 px-4">
  <textarea
    class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
    rows="1"
    use:bindYText={{ yText: ydescription, onCommit: commitDescriptionEdit }}
    use:autogrow
    placeholder={m.description_placeholder()}></textarea>
</div>

<div
  class="flex flex-row items-center justify-between px-4 text-sm text-neutral-600 dark:text-neutral-400"
>
  <label class="flex flex-row items-center gap-1">
    <input type="checkbox" bind:checked={showVotes} />
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
  style:visibility={showVotes ? "visible" : "hidden"}
>
  <span class="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400"
    >✅ {totalVoterCount}</span
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

<ul class="flex flex-col gap-4 pt-2">
  {#each options as option, index (option.id)}
    <li
      class="flex flex-col gap-1 px-2"
      use:droppable={{
        container: index.toString(),
        callbacks: { onDrop: handleOptionDrop },
      }}
    >
      <div class="flex flex-row items-center">
        <span
          class="option-drag-handle cursor-grab self-start text-neutral-400"
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
          class="self-start ml-1"
          aria-label={myVotes[option.id]
            ? m.remove_vote_label()
            : m.vote_label()}
          onclick={() => toggleVote(option.id)}
        >
          {#if myVotes[option.id]}
            <svg
              class="text-blue-500"
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
        <textarea
          class="grow resize-none overflow-hidden wrap-break-word whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500 ml-2"
          rows="1"
          use:bindYText={{
            yText: optionYText(option.id),
            onCommit: commitOptionEdit,
          }}
          use:autogrow
          placeholder={m.option_placeholder()}></textarea>
        {#if option.text.trim() === ""}
          <button
            class="self-start px-1"
            onclick={() => deleteOption(option.id)}>🗑️</button
          >
        {/if}
      </div>
      <div
        class="flex h-2.5 flex-row"
        style:visibility={showVotes ? "visible" : "hidden"}
        role="progressbar"
        aria-label={option.text || m.option_result_bar_label()}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={votePercent(option.id)}
      >
        <div
          class="rounded-l-full bg-blue-500"
          class:rounded-r-full={votePercent(option.id) === 100}
          style="flex-grow: {votePercent(option.id)}"
        ></div>
        <div
          class="rounded-r-full bg-blue-200 dark:bg-blue-950"
          class:rounded-l-full={votePercent(option.id) === 0}
          style="flex-grow: {100 - votePercent(option.id)}"
        ></div>
      </div>
      <div
        class="flex flex-row items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
        style:visibility={showVotes ? "visible" : "hidden"}
      >
        <span class="grow">
          {#each voteNames[option.id] ?? [] as voter, i (i)}
            {#if i > 0}<span>, </span>{/if}
            {#if voter.anonymous}
              <span
                class="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-[#929292] px-1"
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
    </li>
  {/each}
</ul>

<button
  class="self-center px-2 py-1 disabled:opacity-50"
  onclick={addOption}
  aria-label={m.add_option_label()}
>
  <svg class="text-blue-500" width="24" height="24" viewBox="0 0 16 16">
    <path d="M6 2h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="currentColor" />
  </svg>
</button>
