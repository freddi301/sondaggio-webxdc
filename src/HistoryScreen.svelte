<script lang="ts">
  import {
    yshowName,
    yeditLog,
    type EditLogEntry,
    type EditField,
  } from "./yjs-sync";
  import { m } from "./paraglide/messages.js";
  import { getLocale } from "./paraglide/runtime.js";

  interface Voter {
    name: string;
    anonymous: boolean;
  }

  let editLog = $state<EditLogEntry[]>(yeditLog.toArray());
  yeditLog.observe(() => {
    editLog = yeditLog.toArray();
  });
  // Anonymization is a live preference, not baked into the logged entry —
  // re-render the log whenever anyone's changes so it stays current.
  yshowName.observe(() => {
    editLog = [...editLog];
  });

  const historyDateFormat = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "short",
    timeStyle: "short",
  });

  // Only select/deselect entries respect the "show my name" preference —
  // consistent with the votes list itself, which they're a log of.
  function historyVoter(entry: EditLogEntry): Voter {
    if (entry.action.kind === "edit") return { name: entry.userName, anonymous: false };
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
</script>

<div class="flex flex-col gap-2 px-4">
  <h2 class="font-bold">{m.history_heading()}</h2>
  {#if editLog.length === 0}
    <p class="text-sm text-neutral-500 dark:text-neutral-400">{m.history_empty()}</p>
  {:else}
    <ul class="flex flex-col gap-3 text-sm">
      {#each [...editLog].reverse() as entry, index (editLog.length - index)}
        <li class="flex flex-col gap-1">
          <div class="flex flex-row items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{historyDateFormat.format(entry.at)}</span>
            {#if historyVoter(entry).anonymous}
              <span
                class="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-[#929292] px-1"
                >{historyVoter(entry).name}</span
              >
            {:else}
              <span class="font-medium text-black dark:text-neutral-100"
                >{historyVoter(entry).name}</span
              >
            {/if}
            {#if entry.action.kind === "edit"}
              <span class="ml-auto">{editFieldLabel(entry.action.field)} ✏️</span>
            {:else}
              <span class="ml-auto"
                >{entry.action.kind === "select" ? m.history_checked() : m.history_unchecked()}
                {entry.action.kind === "select" ? "✅" : "⭕"}</span
              >
            {/if}
          </div>
          {#if entry.action.kind === "edit"}
            <div
              class="rounded bg-red-100 px-1 break-words whitespace-pre-wrap text-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {entry.action.oldValue}
            </div>
            <div
              class="rounded bg-green-100 px-1 break-words whitespace-pre-wrap text-green-900 dark:bg-green-950 dark:text-green-200"
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
