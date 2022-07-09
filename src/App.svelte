<script lang="ts">
  import type Graph from "graphology";

  import { onMount } from "svelte";
  import { filter } from "./graph";
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
    logseq.onSettingsChanged(() => {
      cacheHit = false;
    });
  });

  let metaDown = false;

  const handleKeydown = (event: KeyboardEvent) => {
    console.log("down", event);
    if (event.key == "Escape") {
      logseq.hideMainUI();
    } else if (event.key === "Meta") {
      metaDown = true;
    }
  };
  const handleKeyup = (event: KeyboardEvent) => {
    console.log("up", event);
    if (event.key === "Meta") {
      metaDown = false;
    }
  };

  const handleNodeClick = async (event: CustomEvent<string>) => {
    console.log("nodeclicked", event, metaDown);
    if ($settings.mode === Mode.Navigate || metaDown) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page) {
        metaDown = false;
        logseq.App.pushState("page", {
          name: page.name,
        });
        logseq.hideMainUI();
      }
    } else if (
      $settings.mode === Mode.AdamicAdar ||
      $settings.mode === Mode.CoCitation
    ) {
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

  function handleCloseClick() {
    logseq.hideMainUI();
  }

  let graphWas: Graph | undefined;
  async function filteredGraph(
    graphP: Promise<Graph>,
    filterEnabled: boolean,
    search: string | undefined,
    filterLength: number
  ): Promise<Graph> {
    const graph = (await graphP).copy();
    if (graphWas) {
      for (const node of graphWas.nodeEntries()) {
        graph.updateNodeAttribute(node.node, "x", () => node.attributes.x);
        graph.updateNodeAttribute(node.node, "y", () => node.attributes.y);
      }
    }
    if (!filterEnabled || !search) {
      graphWas = graph;
      return graph;
    }

    const filterFn = filter(graph, search);
    for (const node of graph.nodes()) {
      if (filterFn(node, filterLength)) {
        graph.dropNode(node);
      }
    }
    graphWas = graph;
    return graph;
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<main>
  {#if $uiVisible && $graph}
    <div class="flex flex-row justify-end pr-2">
      <button
        class="h-8 w-8 p-1 opacity-50 flex justify-center items-center bg-white border-0 hover:opacity-100 hover:bg-slate-100 rounded"
        on:click={handleCloseClick}
      >
        <div class="i-mdi-close text-slate-600" />
      </button>
    </div>
    {#await filteredGraph($graph, $settings.filter, $settings.search, $settings.filterLength) then graph}
      <Sigma on:nodeclick={handleNodeClick} {graph} />
    {/await}
    <Settings />
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
