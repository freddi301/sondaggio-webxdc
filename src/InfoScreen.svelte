<script lang="ts">
  import { m } from "./paraglide/messages.js";
  import { prefs } from "./prefs.svelte";

  const CHIP_RE = /(➕|🗑️|⠿|▲|▼|⏳|☀️|🌙|ℹ️|📥|📤|🗳️|🪙|🥷|✅|👁️|\[[^\]]+\])/u;

  const chipLabel = (part: string) =>
    part.startsWith("[") ? part.slice(1, -1) : part;
</script>

{#snippet line(text: string)}
  {#each text.split(CHIP_RE) as part}
    {#if CHIP_RE.test(part)}
      <span
        class="inline-flex items-center rounded-sm border border-neutral-300 px-1 dark:border-neutral-600"
        >{chipLabel(part)}</span
      >
    {:else}{part}{/if}
  {/each}
{/snippet}

<div class="flex min-h-0 flex-1 flex-col text-sm">
  <div
    class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-6"
  >
    <section
      class="flex flex-col gap-3 rounded-md p-4 shadow-[0_0_16px_rgb(0_0_0/0.15)] dark:shadow-[0_0_20px_rgb(0_0_0)]"
    >
      <div class="flex flex-row items-center justify-between gap-2">
        <h2 class="text-2xl font-bold">{m.info_polls_heading()}</h2>
        <button
          class="shrink-0 rounded-md bg-emerald-700 px-3 py-1 text-sm font-bold text-white"
          onclick={() => (prefs.view = "poll")}
        >
          🗳️&nbsp;&nbsp;{m.poll_view_button()}
        </button>
      </div>
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
    </section>

    <section
      class="flex flex-col gap-3 rounded-md p-4 shadow-[0_0_16px_rgb(0_0_0/0.15)] dark:shadow-[0_0_20px_rgb(0_0_0)]"
    >
      <div class="flex flex-row items-center justify-between gap-2">
        <h2 class="text-2xl font-bold">{m.info_dotvoting_heading()}</h2>
        <button
          class="shrink-0 rounded-md bg-emerald-700 px-3 py-1 text-sm font-bold text-white"
          onclick={() => (prefs.view = "dots")}
        >
          🪙&nbsp;&nbsp;{m.dotvoting_view_button()}
        </button>
      </div>
      <p>{@render line(m.info_dotvoting_intro())}</p>
      <p>{@render line(m.info_feature_dotvoting())}</p>
      <p>{@render line(m.info_feature_dot_voter_count())}</p>
      <p>{@render line(m.info_feature_viewer_count())}</p>
      <p>{@render line(m.info_dotvoting_options())}</p>
      <p>{@render line(m.info_dotvoting_goto())}</p>
    </section>

    <section
      class="flex flex-col gap-3 rounded-md p-4 shadow-[0_0_16px_rgb(0_0_0/0.15)] dark:shadow-[0_0_20px_rgb(0_0_0)]"
    >
      <h2 class="text-2xl font-bold">{m.info_other_heading()}</h2>
      <p>{@render line(m.info_feature_export())}</p>
      <p>{@render line(m.info_feature_import())}</p>
      <p>{@render line(m.info_tip_theme())}</p>
      <p>{@render line(m.info_tip_reread())}</p>
    </section>
  </div>
</div>
