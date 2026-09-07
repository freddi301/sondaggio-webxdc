<script lang="ts">
  import { m } from "./paraglide/messages.js";

  let { onStart }: { onStart: () => void } = $props();

  // Icons and [bracketed UI labels] are embedded directly in the translated
  // strings; split them out so each can be rendered inside a rounded border.
  const CHIP_RE = /(➕|🗑️|⠿|⏳|☀️|🌙|ℹ️|🗳️|🥷|✅|👁️|\[[^\]]+\])/u;

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
  <div
    class="themed-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4"
  >
    <p>{@render line(m.info_intro())}</p>
    <h3 class="font-bold">{m.info_features_heading()}</h3>
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
    <p>{@render line(m.info_tip_theme())}</p>
    <p>{@render line(m.info_tip_reread())}</p>
    <p>{@render line(m.info_tip_vote())}</p>
  </div>
  <button
    class="mt-2 shrink-0 self-center rounded-full bg-blue-500 px-6 py-2 font-bold text-white"
    onclick={onStart}
  >
    {m.info_start_button()}
  </button>
</div>
