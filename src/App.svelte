<script lang="ts">
  import { ydoc, ytitle } from './yjs-sync'

  interface Option {
    id: number
    text: string
  }

  let title = $state(ytitle.toString())
  let description = $state('')

  ytitle.observe(() => {
    const text = ytitle.toString()
    if (text !== title) title = text
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

  let options = $state<Option[]>([{ id: 0, text: '' }])
  let nextId = 1

  function addOption() {
    options.push({ id: nextId++, text: '' })
  }

  function deleteOption(id: number) {
    options = options.filter((option) => option.id !== id)
  }
</script>

<main>
  <div>
    <textarea bind:value={title} oninput={handleTitleInput} placeholder="Title"></textarea>
    {#if titleSaving}💾{/if}
  </div>

  <textarea bind:value={description} placeholder="Description"></textarea>

  <ul>
    {#each options as option (option.id)}
      <li>
        <textarea bind:value={option.text} placeholder="Option"></textarea>
        <button onclick={() => deleteOption(option.id)}>Delete</button>
      </li>
    {/each}
  </ul>

  <button onclick={addOption}>Add option</button>
</main>
