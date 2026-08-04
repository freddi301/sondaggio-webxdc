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
    selfName,
    initialSyncDone,
  } from './yjs-sync'
  import { m } from './paraglide/messages.js'
  import { draggable, droppable, type DragDropState } from '@thisux/sveltednd'

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
      yoptionVotes.set(id, new Y.Map<string>())
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
  let anyOptionSaving = $derived(Object.values(optionSaving).some(Boolean))
  const optionTimers = new Map<string, ReturnType<typeof setTimeout>>()

  let voteNames = $state<Record<string, string[]>>({})
  let myVotes = $state<Record<string, boolean>>({})
  let totalVoterCount = $state(0)

  function syncVotes() {
    const names: Record<string, string[]> = {}
    const mine: Record<string, boolean> = {}
    const voters = new Set<string>()
    for (const id of yoptionOrder.toArray()) {
      const votes = yoptionVotes.get(id)
      names[id] = votes ? [...votes.values()] : []
      mine[id] = votes?.has(selfId) ?? false
      if (votes) for (const voter of votes.keys()) voters.add(voter)
    }
    voteNames = names
    myVotes = mine
    totalVoterCount = voters.size
  }

  yoptionVotes.observeDeep(syncVotes)
  yoptionOrder.observe(syncVotes)
  syncVotes()

  function voteCount(id: string): number {
    return voteNames[id]?.length ?? 0
  }

  function votePercent(id: string): number {
    if (totalVoterCount === 0) return 0
    return Math.round((voteCount(id) / totalVoterCount) * 100)
  }

  function toggleVote(id: string) {
    const votes = yoptionVotes.get(id)
    if (!votes) return
    ydoc.transact(() => {
      if (votes.has(selfId)) {
        votes.delete(selfId)
      } else {
        votes.set(selfId, selfName)
      }
    })
  }

  function handleOptionDrop(state: DragDropState<Option>) {
    const { draggedItem, targetContainer, dropPosition } = state
    const order = yoptionOrder.toArray()
    const dragIndex = order.indexOf(draggedItem.id)
    let dropIndex = parseInt(targetContainer ?? '0')
    if (dropPosition === 'after') dropIndex++
    if (dragIndex === -1) return
    const adjusted = dragIndex < dropIndex ? dropIndex - 1 : dropIndex
    if (adjusted === dragIndex) return
    ydoc.transact(() => {
      yoptionOrder.delete(dragIndex, 1)
      yoptionOrder.insert(adjusted, [draggedItem.id])
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

<main class="flex min-h-screen flex-col gap-2 bg-white p-2 text-black dark:bg-neutral-800 dark:text-neutral-100">
  <div class="flex flex-row items-center gap-2">
    <span class="grow font-bold">{m.app_name()}</span>
    <button class="px-1" onclick={() => (dark = !dark)}>
      {dark ? '☀️' : '🌙'}
    </button>
  </div>

  <div class="relative flex flex-row items-center gap-2">
    <textarea
      class="grow resize-none overflow-hidden text-xl font-bold break-words whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
      rows="1"
      bind:value={title}
      use:autogrow={title}
      oninput={handleTitleInput}
      placeholder={m.title_placeholder()}
    ></textarea>
    <span class="absolute top-0 right-0" class:opacity-0={!titleSaving}>💾</span>
  </div>

  <div class="relative flex flex-row items-center gap-2">
    <textarea
      class="grow resize-none overflow-hidden break-words whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500"
      rows="1"
      bind:value={description}
      use:autogrow={description}
      oninput={handleDescriptionInput}
      placeholder={m.description_placeholder()}
    ></textarea>
    <span class="absolute top-0 right-0" class:opacity-0={!descriptionSaving}>💾</span>
  </div>

  <ul class="flex flex-col gap-4 pt-4">
    {#each options as option, index (option.id)}
      <li
        class="flex flex-col gap-1"
        use:draggable={{
          container: index.toString(),
          dragData: option,
          handle: '.option-drag-handle',
        }}
        use:droppable={{
          container: index.toString(),
          callbacks: { onDrop: handleOptionDrop },
        }}
      >
        <div class="relative flex flex-row items-center">
          <span class="option-drag-handle cursor-grab self-start text-neutral-400">
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
            aria-label={myVotes[option.id] ? 'Remove vote' : 'Vote'}
            onclick={() => toggleVote(option.id)}
          >
            {#if myVotes[option.id]}
              <svg class="text-blue-500" width="28" height="28" viewBox="0 0 16 16">
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
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>
            {/if}
          </button>
          <textarea
            class="grow resize-none overflow-hidden break-words whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500 ml-2"
            rows="1"
            bind:value={option.text}
            use:autogrow={option.text}
            oninput={() => handleOptionInput(option.id)}
            placeholder={m.option_placeholder()}
          ></textarea>
          {#if optionSaving[option.id]}
            <span class="absolute top-0 right-0">💾</span>
          {:else if option.text.trim() === ''}
            <button class="self-start px-1" onclick={() => deleteOption(option.id)}>🗑️</button>
          {/if}
        </div>
        <div class="flex h-2.5 flex-row">
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
        <div class="flex flex-row items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span class="grow"
            >{voteNames[option.id]?.join(', ') ?? ''}</span
          >
          <span class="self-start whitespace-nowrap"
            >{voteCount(option.id)}/{totalVoterCount} ({votePercent(option.id)}%)</span
          >
        </div>
      </li>
    {/each}
  </ul>

  <button
    class="self-center px-2 py-1 disabled:opacity-50"
    disabled={anyOptionSaving}
    onclick={addOption}
    aria-label="Add option"
  >
    <svg class="text-blue-500" width="24" height="24" viewBox="0 0 16 16">
      <path d="M6 2h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="currentColor" />
    </svg>
  </button>
</main>
