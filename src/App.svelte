<script lang="ts">
  import type Graph from "graphology";

  import { onMount } from "svelte";
  import { filter } from "./graph";
  import Node from "./Node.svelte";
  import Edge from "./Edge.svelte";
  import Settings from "./settings/Settings.svelte";
  import Sigma from "./Sigma.svelte";
  import {
    uiVisible,
    store,
    graph,
    settings,
    Mode,
    NodeFilter,
  } from "./stores";
  import { setThemeColors } from "./settings/themes";

  onMount(async () => {
    // do this first to avoid overwriting of filters
    if (logseq.settings) {
      if (logseq.settings.filters) {
        let filters: NodeFilter[] = logseq.settings.filters;
        // reset ids to be sequential
        filters.forEach((el, index) => {
          el.id = index;
          return el;
        });
        $settings.filters = filters;
      } else {
        $settings.filters = [];
      }
    }
    logseq.App.onThemeModeChanged((event) => {
      setThemeColors();
      $settings.themeMode = event.mode;
    });
    logseq.App.onThemeChanged((event) => {
      setThemeColors();
      if (event.mode === "dark") {
        $settings.themeMode = "dark";
      } else {
        $settings.themeMode = "light";
      }
    });

    // @ts-ignore
    logseq.on("ui:visible:changed", async ({ visible }) => {
      store.visible(visible);
      if (visible) {
        store.reload();
      }
    });
    $settings.themeMode = (
      await logseq.App.getUserConfigs()
    ).preferredThemeMode;

    logseq.DB.onChanged(() => {
      if ($uiVisible) {
        store.reload();
      }
    });
  });

  let metaDown = false;
  let shiftDown = false;
  $: {
    if (logseq.settings) {
      if (logseq.settings.filters) {
        let filters: Array<NodeFilter> = $settings.filters;
        const seen = new Set();
        filters = filters.filter((el) => {
          if (el.id === undefined) {
            return false;
          }
          const duplicate = seen.has(el.id);
          seen.add(el.id);
          return !duplicate;
        });
        // Doesn't updates without reset if you delete items from list
        logseq.updateSettings({ filters: null });
        logseq.updateSettings({ filters: filters });
      } else {
        logseq.updateSettings({ filters: [] });
      }
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key == "Escape") {
      logseq.hideMainUI();
    } else if (event.key === "Meta") {
      metaDown = true;
    }
    if (event.key === "Shift") {
      shiftDown = true;
    }
  };
  const handleKeyup = (event: KeyboardEvent) => {
    if (event.key === "Meta") {
      metaDown = false;
    }
    if (event.key === "Shift") {
      shiftDown = false;
    }
  };

  const handleNodeClick = async (event: CustomEvent<string>) => {
    console.log("nodeclicked", event, metaDown, shiftDown);
    if (shiftDown) {
      const page = await logseq.Editor.getPage(+event.detail);
      if (page) {
        logseq.Editor.openInRightSidebar(page.uuid);
      }
    } else if ($settings.mode === Mode.Navigate || metaDown) {
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

  function handleCloseClick() {
    logseq.hideMainUI();
  }

  let graphWas: Graph | undefined;

  function saveNodesPositions(graph: Graph): Graph {
    // save nodes positions to keep it same when you close and open ui
    if (graphWas) {
      for (const node of graphWas.nodeEntries()) {
        if (graph.hasNode(node.node)) {
          graph.updateNodeAttribute(node.node, "x", () => node.attributes.x);
          graph.updateNodeAttribute(node.node, "y", () => node.attributes.y);
        }
      }
    }
    graphWas = graph;
    return graph;
  }

  function filteredGraph(
    graph: Graph,
    filterEnabled: boolean,
    search: string | undefined,
    filterLength: number,
  ): Graph {
    graph.forEachNode((node) => {
      graph.setNodeAttribute(node, "hidden", false);
    });
    if (!filterEnabled || !search) {
      return saveNodesPositions(graph);
    }

    const filterFn = filter(graph, search);
    graph.forEachNode((node) => {
      if (filterFn(node, filterLength)) {
        graph.setNodeAttribute(node, "hidden", true);
      }
    });
    return saveNodesPositions(graph);
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<main>
  <div class="flex flex-row justify-end pr-2">
    <button
      class="h-8 w-8 p-1 opacity-50 flex justify-center items-center bg-white border-0 hover:opacity-100 hover:bg-slate-100 rounded"
      on:click={handleCloseClick}
    >
      <div class="i-mdi-close text-slate-600" />
    </button>
  </div>
  <Sigma on:nodeclick={handleNodeClick} size={$graph.size}>
    {@const graph = filteredGraph(
      $graph,
      $settings.filter,
      $settings.search,
      $settings.filterLength,
    )}
    {#each graph.nodes() as node (node)}
      <Node id={node} attributes={graph.getNodeAttributes(node)} />
    {/each}
    {#each graph.edges() as edge (edge)}
      <Edge
        source={graph.source(edge)}
        target={graph.target(edge)}
        attributes={graph.getEdgeAttributes(edge)}
      />
    {/each}
  </Sigma>
  <Settings />
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
    width: 100%;
    height: 100%;
  }
</style>
