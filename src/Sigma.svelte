<script lang="ts">
  import {
    onMount,
    onDestroy,
    createEventDispatcher,
    afterUpdate,
  } from "svelte";
  import Sigma from "sigma";
  import FA2Layout from "graphology-layout-forceatlas2/worker";
  import forceAtlas2 from "graphology-layout-forceatlas2";
  import type Graph from "graphology";
  import type { SigmaNodeEventPayload } from "sigma/sigma";
  import type { Attributes } from "graphology-types";
  import type { EdgeDisplayData, NodeDisplayData } from "sigma/types";
  import { Mode, settings } from "./stores";
  import { adamicAdar, coCitation, ResultMap } from "./analysis";
  import {
    shortestPathDirected,
    shortestPathUndirected,
    shortestPathEdgePredicate,
  } from "./shortestPath";
  import { nodeNameIndex } from "./graph";
  import { labelPropagation } from "./labelPropagation";

  export let graph: Graph;

  let sigmaRef: HTMLElement;
  let sigma: Sigma | undefined;
  let fa2Layout: FA2Layout | undefined;

  const dispatch = createEventDispatcher();

  const red = "#f87171";
  const green = "#4ade80";
  const blue = "#60a5fa";
  const yellow = "#facc15";
  const orange = "#fb923c";
  const grey = "#a3a3a3";

  onMount(async () => {
    const g = graph;
    sigma = new Sigma(g, sigmaRef, {
      allowInvalidContainer: true,
      nodeReducer,
      edgeReducer,
      defaultNodeColor: grey,
    });
    sigma.on("clickNode", handleNodeClick);
  });

  afterUpdate(() => {
    if (sigma) {
      sigma.refresh();
      if (fa2Layout) {
        fa2Layout.kill();
      }
      const sensibleSettings = forceAtlas2.inferSettings(graph);
      sensibleSettings.gravity = $settings.gravity;
      fa2Layout = new FA2Layout(graph, {
        settings: sensibleSettings,
      });
      fa2Layout.start();
    }
  });

  onDestroy(async () => {
    if (fa2Layout) {
      fa2Layout.kill();
      fa2Layout = undefined;
    }
    if (sigma) {
      sigma.kill();
      sigma = undefined;
    }
  });

  const handleNodeClick = async ({ node }: SigmaNodeEventPayload) => {
    dispatch("nodeclick", node);
  };

  const maxSize = (size: number, max: number) => {
    if (size > max) {
      return max;
    } else {
      return size;
    }
  };

  const nodeReducer = (node: string, data: Attributes) => {
    const res: Partial<NodeDisplayData> = { ...data };
    if ($settings.size === "in") {
      res.size = maxSize(Math.max(2, graph.neighbors(node).length / 2), 16);
    } else if ($settings.size === "out") {
      res.size = maxSize(graph.inDegree(node), 16);
    }

    const label = res.label?.toUpperCase();
    const search = $settings.search?.toUpperCase();

    if (
      search &&
      label &&
      (label.includes(search) ||
        data["aliases"]?.find((a: string) => a.includes(search)))
    ) {
      res.color = orange;
      res.size = (res.size ?? data.size) + 2;
      res.highlighted = true;
    }

    if ($settings.mode === Mode.ShortestPath) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      const pathB =
        $settings.pathB && nodeIndex?.get($settings.pathB.toUpperCase());

      if (
        shortestNodePath?.includes(node) ||
        node === pathA ||
        node === pathB
      ) {
        res.color = red;
        res.zIndex = 2;
        res.highlighted = true;
      } else {
        res.zIndex = -1;
      }
    }

    if ($settings.mode === Mode.AdamicAdar && adamicAdarResults) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      if (pathA && node === pathA) {
        res.size = 10;
        res.zIndex = 2;
        res.color = orange;
        res.highlighted = true;
      } else if (adamicAdarResults[node]) {
        res.color = red;
        res.size = maxSize(
          $settings.bubbleSize * adamicAdarResults[node].measure,
          32
        );
        res.label = `${adamicAdarResults[node].measure} ${data.label}`;
      }
    }
    if ($settings.mode === Mode.CoCitation && coCitationResults) {
      const pathA =
        $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
      if (pathA && node === pathA) {
        res.size = 10;
        res.zIndex = 2;
        res.color = orange;
        res.highlighted = true;
      } else if (coCitationResults[node]) {
        res.color = red;
        res.size = $settings.bubbleSize * coCitationResults[node].measure;
        res.label = `${coCitationResults[node].measure} ${data.label}`;
      }
    }

    if ($settings.mode === Mode.LabelPropagation && labelPropagationFn) {
      if ($settings.labels.includes(node)) {
        res.highlighted = true;
      }
      res.color = labelPropagationFn(node);
    }

    return res;
  };

  let shortestNodePath: Array<string> | undefined | null;
  let shortestEdgePath: Array<string> | undefined | null;
  let adamicAdarResults: ResultMap | undefined;
  let nodeIndex: Map<string, string> | undefined;
  let coCitationResults: any;
  let labelPropagationFn: ((node: string) => string) | undefined;

  $: if (sigma) {
    nodeIndex = nodeNameIndex(sigma.getGraph());
  }

  $: if (
    sigma &&
    $settings.mode === Mode.ShortestPath &&
    $settings.pathA &&
    $settings.pathB
  ) {
    const graph = sigma.getGraph();
    const results = $settings.directed
      ? shortestPathDirected(graph, $settings.pathA, $settings.pathB)
      : shortestPathUndirected(graph, $settings.pathB, $settings.pathA);
    shortestNodePath = results.nodes;
    shortestEdgePath = results.edges;
  } else {
    shortestNodePath = undefined;
    shortestEdgePath = undefined;
  }

  $: if (sigma && $settings.mode === Mode.AdamicAdar && $settings.pathA) {
    const graph = sigma.getGraph();
    const pathA =
      $settings.pathA && nodeIndex?.get($settings.pathA.toUpperCase());
    if (pathA) {
      adamicAdarResults = adamicAdar(graph, pathA);
      console.log(adamicAdarResults);
    } else {
      adamicAdarResults = undefined;
    }
  } else {
    adamicAdarResults = undefined;
  }

  $: if (sigma && $settings.mode === Mode.CoCitation && $settings.pathA) {
    const pathA = nodeIndex?.get($settings.pathA.toUpperCase());
    if (pathA) {
      const node = sigma.getGraph().getNodeAttributes(pathA);
      (async () =>
        (coCitationResults = await coCitation(sigma.getGraph(), node)))();
    } else {
      coCitationResults = undefined;
    }
  } else {
    coCitationResults = undefined;
  }

  $: if (
    sigma &&
    $settings.mode == Mode.LabelPropagation &&
    $settings.labels.length
  ) {
    labelPropagationFn = labelPropagation(
      sigma.getGraph(),
      $settings.labels,
      {
        red,
        green,
        blue,
        yellow,
      },
      $settings.colorSize
    );
  } else {
    labelPropagationFn = undefined;
  }

  const edgeReducer = (edge: string, data: Attributes) => {
    const res: Partial<EdgeDisplayData> = { ...data };
    if (
      sigma &&
      $settings.mode === Mode.ShortestPath &&
      shortestPathEdgePredicate(shortestEdgePath, edge)
    ) {
      res.color = red;
      res.size = 5;
    }
    if (sigma && $settings.mode === Mode.LabelPropagation) {
      res.color = "#f1f5f9";
    }
    return res;
  };
</script>

<div class="sigma" bind:this={sigmaRef} />

<style>
  .sigma {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
