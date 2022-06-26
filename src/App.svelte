<script lang="ts">
  import { onMount } from "svelte";
  import Settings from "./Settings.svelte";
  import Sigma from "./Sigma.svelte";
  import { uiVisible, store, graph, settings, Mode } from "./stores";

  let cacheHit = false;
  onMount(async () => {
    // @ts-ignore
    logseq.on("ui:visible:changed", async ({ visible }) => {
      store.visible(visible);
    });
    logseq.DB.onChanged(() => {
      cacheHit = false;
    });
  });

  let metaDown = false;

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key == "Escape") {
      logseq.hideMainUI();
    } else if (event.key === "Meta") {
      metaDown = true;
    }
  };
  const handleKeyup = (event: KeyboardEvent) => {
    if (event.key === "Meta") {
      metaDown = false;
    }
  };

  const handleNodeClick = async (event: CustomEvent<string>) => {
    console.log("nodeclicked", event, metaDown);
    if ($settings.mode === Mode.Navigate || metaDown) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page) {
        logseq.App.pushState("page", {
          name: page.name,
        });
        logseq.hideMainUI();
      }
    } else if ($settings.mode === Mode.AdamicAdar) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page && $settings.pathA !== page.name) {
        $settings.pathA = page.name;
      } else {
        $settings.pathA = undefined;
      }
    } else if ($settings.mode === Mode.ShortestPath && !$settings.pathA) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page) {
        $settings.pathA = page.name;
      }
    } else if ($settings.mode === Mode.ShortestPath && $settings.pathA) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page) {
        $settings.pathB = page.name;
      }
    }
  };

  $: if ($uiVisible && !cacheHit) {
    store.reload();
    cacheHit = true;
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<main>
  {#if $uiVisible && $graph}
    {#await $graph then graph}
      <Sigma on:nodeclick={handleNodeClick} {graph} />
      <Settings />
    {/await}
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
    width: 100%;
    height: 100%;
  }
</style>
