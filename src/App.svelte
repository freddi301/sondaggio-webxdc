<script lang="ts">
  import * as Y from 'yjs'
  import {
    ydoc,
    ytitle,
    ydescription,
    yoptionTexts,
    yoptionOrder,
    yoptionVotes,
    selfId,
    initialSyncDone,
  } from './yjs-sync'
  import { m } from './paraglide/messages.js'

  interface Option {
    id: string
    text: string
  }

  // Grows the textarea's height to fit its content, re-measuring on every
  // input and whenever the bound value changes programmatically (e.g. a
  // remote yjs update), since only the former fires a native 'input' event.
  function autogrow(node: HTMLTextAreaElement, _value: string) {
    function resize() {
      node.style.height = 'auto'
      node.style.height = `${node.scrollHeight}px`
    }
    resize()
    node.addEventListener('input', resize)
    return {
      update: resize,
      destroy() {
        node.removeEventListener('input', resize)
      },
    }
  }

  const THEME_KEY = 'sondaggio-dark'

  // The destination browser can't tell us the real preference, so default to dark.
  let dark = $state(localStorage.getItem(THEME_KEY) !== 'false')

  $effect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(THEME_KEY, String(dark))
  })

  let title = $state(ytitle.toString())
  let description = $state(ydescription.toString())

  ytitle.observe(() => {
    const text = ytitle.toString()
    if (text !== title) title = text
  })

  ydescription.observe(() => {
    const text = ydescription.toString()
    if (text !== description) description = text
  })

  let titleSaving = $state(false)
  let titleTimer: ReturnType<typeof setTimeout> | undefined

  function handleTitleInput() {
    titleSaving = true
    clearTimeout(titleTimer)
    titleTimer = setTimeout(() => {
      titleSaving = false
      if (title !== ytitle.toString()) {
        ydoc.transact(() => {
          ytitle.delete(0, ytitle.length)
          ytitle.insert(0, title)
        })
      }
    }, 3000)
  }

  let descriptionSaving = $state(false)
  let descriptionTimer: ReturnType<typeof setTimeout> | undefined

  function handleDescriptionInput() {
    descriptionSaving = true
    clearTimeout(descriptionTimer)
    descriptionTimer = setTimeout(() => {
      descriptionSaving = false
      if (description !== ydescription.toString()) {
        ydoc.transact(() => {
          ydescription.delete(0, ydescription.length)
          ydescription.insert(0, description)
        })
      }
    }, 3000)
  }

  function readOptions(): Option[] {
    return yoptionOrder.toArray().map((id) => ({
      id,
      text: yoptionTexts.get(id)?.toString() ?? '',
    }))
  }

  let options = $state<Option[]>(readOptions())

  function syncOptions() {
    options = yoptionOrder.toArray().map((id) => {
      const text = yoptionTexts.get(id)?.toString() ?? ''
      const existing = options.find((option) => option.id === id)
      return existing && existing.text === text ? existing : { id, text }
    })
  }

  yoptionOrder.observe(syncOptions)
  yoptionTexts.observeDeep(syncOptions)

  function addOption() {
    const id = crypto.randomUUID()
    ydoc.transact(() => {
      yoptionTexts.set(id, new Y.Text())
      yoptionVotes.set(id, new Y.Map<boolean>())
      yoptionOrder.push([id])
    })
  }

  // Start with one empty option, same as before options were synced — but
  // only once past updates have actually been replayed, otherwise every
  // reload would look empty for a moment and get its own spurious option.
  initialSyncDone.then(() => {
    if (yoptionOrder.length === 0) addOption()
  })

  function deleteOption(id: string) {
    ydoc.transact(() => {
      const index = yoptionOrder.toArray().indexOf(id)
      if (index !== -1) yoptionOrder.delete(index, 1)
      yoptionTexts.delete(id)
      yoptionVotes.delete(id)
    })
    clearTimeout(optionTimers.get(id))
    optionTimers.delete(id)
    delete optionSaving[id]
  }

  let optionSaving = $state<Record<string, boolean>>({})
  const optionTimers = new Map<string, ReturnType<typeof setTimeout>>()

  let voteCounts = $state<Record<string, number>>({})
  let myVotes = $state<Record<string, boolean>>({})
  let totalVoterCount = $state(0)

  function syncVotes() {
    const counts: Record<string, number> = {}
    const mine: Record<string, boolean> = {}
    const voters = new Set<string>()
    for (const id of yoptionOrder.toArray()) {
      const votes = yoptionVotes.get(id)
      counts[id] = votes?.size ?? 0
      mine[id] = votes?.has(selfId) ?? false
      if (votes) for (const voter of votes.keys()) voters.add(voter)
    }
    voteCounts = counts
    myVotes = mine
    totalVoterCount = voters.size
  }

  yoptionVotes.observeDeep(syncVotes)
  yoptionOrder.observe(syncVotes)
  syncVotes()

  function votePercent(id: string): number {
    if (totalVoterCount === 0) return 0
    return Math.round(((voteCounts[id] ?? 0) / totalVoterCount) * 100)
  }

  function toggleVote(id: string) {
    const votes = yoptionVotes.get(id)
    if (!votes) return
    ydoc.transact(() => {
      if (votes.has(selfId)) {
        votes.delete(selfId)
      } else {
        votes.set(selfId, true)
      }
    })
  }

  function handleOptionInput(id: string) {
    optionSaving[id] = true
    clearTimeout(optionTimers.get(id))
    optionTimers.set(
      id,
      setTimeout(() => {
        optionSaving[id] = false
        const option = options.find((o) => o.id === id)
        const ytext = yoptionTexts.get(id)
        if (option && ytext && option.text !== ytext.toString()) {
          ydoc.transact(() => {
            ytext.delete(0, ytext.length)
            ytext.insert(0, option.text)
          })
        }
      }, 3000),
    )
  }
</script>

<main class="flex min-h-screen flex-col gap-2 bg-white p-2 text-black dark:bg-neutral-900 dark:text-neutral-100">
  <div class="flex flex-row items-center gap-2">
    <span class="grow font-bold">{m.app_name()}</span>
    <button
      class="border border-neutral-300 px-2 py-1 dark:border-neutral-700"
      onclick={() => (dark = !dark)}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  </div>

  <div class="flex flex-row items-center gap-2 border border-neutral-300 dark:border-neutral-700">
    <textarea
      class="grow resize-none overflow-hidden px-1 break-words whitespace-pre-wrap"
      rows="1"
      bind:value={title}
      use:autogrow={title}
      oninput={handleTitleInput}
    ></textarea>
    <span class:opacity-0={!titleSaving}>💾</span>
  </div>

  <div class="flex flex-row items-center gap-2 border border-neutral-300 dark:border-neutral-700">
    <textarea
      class="grow resize-none overflow-hidden px-1 break-words whitespace-pre-wrap"
      rows="1"
      bind:value={description}
      use:autogrow={description}
      oninput={handleDescriptionInput}
    ></textarea>
    <span class:opacity-0={!descriptionSaving}>💾</span>
  </div>

  <ul class="flex flex-col gap-2">
    {#each options as option (option.id)}
      <li class="flex flex-col">
        <div class="flex flex-row items-center">
          <button
            class="self-start border-y border-l border-neutral-300 dark:border-neutral-700"
            onclick={() => toggleVote(option.id)}
          >
            {myVotes[option.id] ? '☑' : '☐'}
          </button>
          <textarea
            class="grow resize-none overflow-hidden border border-neutral-300 px-1 break-words whitespace-pre-wrap dark:border-neutral-700"
            rows="1"
            bind:value={option.text}
            use:autogrow={option.text}
            oninput={() => handleOptionInput(option.id)}
          ></textarea>
          {#if optionSaving[option.id]}
            <span>💾</span>
          {:else}
            <button
              class="self-start border-y border-r border-neutral-300 px-1 dark:border-neutral-700"
              onclick={() => deleteOption(option.id)}
            >
              🗑️
            </button>
          {/if}
        </div>
        <div class="flex flex-row items-center gap-1 text-sm">
          🧑 {voteCounts[option.id] ?? 0}/{totalVoterCount} ({votePercent(option.id)}%)
        </div>
      </li>
    {/each}
  </ul>

  <button
    class="self-center border border-neutral-300 px-2 py-1 dark:border-neutral-700"
    onclick={addOption}
  >
    ➕
  </button>
</main>
