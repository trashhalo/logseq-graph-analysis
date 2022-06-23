<script lang="ts">
  import { onMount } from "svelte";
  import { uiVisible, store } from "./stores";

  onMount(() => {
    // @ts-ignore
    logseq.on("ui:visible:changed", async ({ visible }) => {
      store.visible(visible);
    });
  });

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key == "Escape") {
      logseq.hideMainUI();
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<main>
  {#if uiVisible}
    <h1> hello world </h1>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;

    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    font-family: Arial, Helvetica, sans-serif;
    background: white;
  }
</style>
