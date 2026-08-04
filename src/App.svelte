<script lang="ts">
  import { ydoc, ytitle, ydescription } from './yjs-sync'
  import { m } from './paraglide/messages.js'

  interface Option {
    id: number
    text: string
  }

  // The destination browser can't tell us the real preference, so default to dark.
  let dark = $state(true)

  $effect(() => {
    document.documentElement.classList.toggle('dark', dark)
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

  let options = $state<Option[]>([{ id: 0, text: '' }])
  let nextId = 1

  function addOption() {
    options.push({ id: nextId++, text: '' })
  }

  function deleteOption(id: number) {
    options = options.filter((option) => option.id !== id)
  }
</script>

<main class="flex min-h-screen flex-col gap-2 bg-white p-2 text-black dark:bg-neutral-900 dark:text-neutral-100">
  <div class="flex flex-row items-center gap-2">
    <span class="grow font-bold">{m.app_name()}</span>
    <button onclick={() => (dark = !dark)}>{dark ? '☀️' : '🌙'}</button>
  </div>

  <div class="flex flex-row items-center gap-2 border border-neutral-300 px-1 dark:border-neutral-700">
    <textarea
      class="grow resize-none"
      rows="1"
      bind:value={title}
      oninput={handleTitleInput}
      placeholder={m.title_placeholder()}
    ></textarea>
    <span class:opacity-0={!titleSaving}>💾</span>
  </div>

  <div class="flex flex-row items-center gap-2 border border-neutral-300 px-1 dark:border-neutral-700">
    <textarea
      class="grow resize-none"
      rows="1"
      bind:value={description}
      oninput={handleDescriptionInput}
      placeholder={m.description_placeholder()}
    ></textarea>
    <span class:opacity-0={!descriptionSaving}>💾</span>
  </div>

  <ul>
    {#each options as option (option.id)}
      <li>
        <textarea
          class="resize-none border border-neutral-300 px-1 dark:border-neutral-700"
          rows="1"
          bind:value={option.text}
          placeholder={m.option_placeholder()}
        ></textarea>
        <button onclick={() => deleteOption(option.id)}>{m.delete()}</button>
      </li>
    {/each}
  </ul>

  <button onclick={addOption}>{m.add_option()}</button>
</main>
