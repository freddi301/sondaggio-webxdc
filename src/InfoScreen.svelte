<script lang="ts">
  import { m } from "./paraglide/messages.js";

  const CHIP_RE = /(➕|🗑️|⠿|▲|▼|⏳|☀️|🌙|ℹ️|🗳️|🪙|🥷|✅|👁️|\[[^\]]+\])/u;

  const chipLabel = (part: string) =>
    part.startsWith("[") ? part.slice(1, -1) : part;
</script>

{#snippet line(text: string)}
  {#each text.split(CHIP_RE) as part}
    {#if CHIP_RE.test(part)}
      <span
        class="inline-flex items-center rounded border border-neutral-300 px-1 dark:border-neutral-600"
        >{chipLabel(part)}</span
      >
    {:else}{part}{/if}
  {/each}
{/snippet}

<div class="flex h-[calc(100dvh-4rem)] flex-col gap-3 pb-2 text-sm">
  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
    <h2 class="text-lg font-bold">{m.info_polls_heading()}</h2>
    <p>{@render line(m.info_feature_edit())}</p>
    <p>{@render line(m.info_feature_add())}</p>
    <p>{@render line(m.info_feature_delete())}</p>
    <p>{@render line(m.info_feature_reorder())}</p>
    <p>{@render line(m.info_feature_vote())}</p>
    <p>{@render line(m.info_feature_anon())}</p>
    <p>{@render line(m.info_feature_votes())}</p>
    <p>{@render line(m.info_feature_voter_count())}</p>
    <p>{@render line(m.info_feature_viewer_count())}</p>
    <p>{@render line(m.info_feature_history())}</p>
    <p>{@render line(m.info_polls_goto())}</p>

    <h2 class="text-lg font-bold">{m.info_dotvoting_heading()}</h2>
    <p>{@render line(m.info_feature_dotvoting())}</p>
    <p>{@render line(m.info_dotvoting_options())}</p>
    <p>{@render line(m.info_dotvoting_goto())}</p>

    <h2 class="text-lg font-bold">{m.info_other_heading()}</h2>
    <p>{@render line(m.info_tip_theme())}</p>
    <p>{@render line(m.info_tip_reread())}</p>
  </div>
</div>
