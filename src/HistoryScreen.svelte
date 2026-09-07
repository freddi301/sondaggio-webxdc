<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    yshowName,
    yeditLog,
    type EditLogEntry,
    type EditField,
    type EditAction,
  } from "./yjs-sync";
  import { m } from "./paraglide/messages.js";
  import { getLocale } from "./paraglide/runtime.js";

  interface Voter {
    name: string;
    anonymous: boolean;
  }

  let editLog = $state<EditLogEntry[]>(yeditLog.toArray());
  function syncEditLog() {
    editLog = yeditLog.toArray();
  }
  function refreshLog() {
    editLog = [...editLog];
  }
  yeditLog.observe(syncEditLog);
  yshowName.observe(refreshLog);
  onDestroy(() => {
    yeditLog.unobserve(syncEditLog);
    yshowName.unobserve(refreshLog);
  });

  const historyDateFormat = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "short",
    timeStyle: "short",
  });

  function historyVoter(entry: EditLogEntry): Voter {
    const shown = yshowName.get(entry.userId) ?? true;
    return { name: shown ? entry.userName : "🥷", anonymous: !shown };
  }

  function editFieldLabel(field: EditField): string {
    switch (field.kind) {
      case "title":
        return m.history_field_title();
      case "description":
        return m.history_field_description();
      case "option":
        return m.history_field_option();
    }
  }

  function actionSummary(action: Exclude<EditAction, { kind: "edit" }>): {
    text: string;
    icon: string;
  } {
    switch (action.kind) {
      case "select":
        return { text: m.history_checked(), icon: "✅" };
      case "deselect":
        return { text: m.history_unchecked(), icon: "⭕" };
      case "dot_inc":
        return { text: m.history_dot_added(), icon: "🪙" };
      case "dot_dec":
        return { text: m.history_dot_removed(), icon: "🪙" };
    }
  }
</script>

<div class="flex flex-col gap-2 px-4">
  <h2 class="font-bold">{m.history_heading()}</h2>
  {#if editLog.length === 0}
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {m.history_empty()}
    </p>
  {:else}
    <ul class="flex flex-col-reverse gap-3 text-sm">
      {#each editLog as entry, i (i)}
        {@const voter = historyVoter(entry)}
        <li class="flex flex-col gap-1">
          <div
            class="flex flex-row items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"
          >
            <span>{historyDateFormat.format(entry.at)}</span>
            {#if voter.anonymous}
              <span
                class="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-[#929292] px-1"
                >{voter.name}</span
              >
            {:else}
              <span class="font-medium text-black dark:text-neutral-100"
                >{voter.name}</span
              >
            {/if}
            {#if entry.action.kind === "edit"}
              <span class="ml-auto"
                >{editFieldLabel(entry.action.field)} ✏️</span
              >
            {:else}
              {@const summary = actionSummary(entry.action)}
              <span class="ml-auto">{summary.text} {summary.icon}</span>
            {/if}
          </div>
          {#if entry.action.kind === "edit"}
            <div
              class="rounded bg-red-100 px-1 wrap-break-word whitespace-pre-wrap text-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {entry.action.oldValue}
            </div>
            <div
              class="rounded bg-green-100 px-1 wrap-break-word whitespace-pre-wrap text-green-900 dark:bg-green-950 dark:text-green-200"
            >
              {entry.action.newValue}
            </div>
          {:else}
            <div>{entry.action.optionLabel}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
