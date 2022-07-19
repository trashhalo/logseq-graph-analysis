<script lang="ts">
  import type Graph from "graphology";

  import { getContext, onDestroy, onMount } from "svelte";

  const { getGraph } = getContext("sigma");

  export let source: string;
  export let target: string;
  export let attributes: any;

  onMount(() => {
    const graph = getGraph();
    if (graph) {
      if (!graph.hasNode(source)) {
        graph.addNode(source, {
          x: 0,
          y: 0,
        });
      }
      if (!graph.hasNode(target)) {
        graph.addNode(target, {
          x: 0,
          y: 0,
        });
      }
    }
    getGraph()?.addDirectedEdge(source, target, attributes);
  });

  onDestroy(() => {
    const graph: Graph = getGraph();
    if (graph && graph.hasDirectedEdge(source, target)) {
      graph.dropDirectedEdge(source, target);
    }
  });
</script>
