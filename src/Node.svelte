<script lang="ts">
  import type Graph from "graphology";

  import { afterUpdate, getContext, onDestroy, onMount } from "svelte";

  const { getGraph } = getContext("sigma");

  export let id: string;
  export let attributes: any;

  onDestroy(() => {
    const graph: Graph = getGraph();
    if (!graph) return;
    if (graph.hasNode(id)) {
      graph.dropNode(id);
    }
  });

  afterUpdate(() => {
    const graph: Graph = getGraph();
    if (!graph) return;
    if (graph.hasNode(id)) {
      graph.updateNodeAttributes(id, () => attributes);
    } else {
      graph.addNode(id, attributes);
    }
  });
</script>
