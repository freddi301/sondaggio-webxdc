<script lang="ts">
  interface Option {
    id: number
    text: string
  }

  let title = $state('')
  let description = $state('')
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
  <textarea bind:value={title} placeholder="Title"></textarea>

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
