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
  import toUndirected from "graphology-operators/to-undirected";
  import type { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";
  import { Mode, settings } from "./stores";
  import { dijkstra, edgePathFromNodePath } from "graphology-shortest-path";
  import { adamicAdar, coCitation, ResultMap } from "./analysis";

  export let graph: Graph;

  let sigmaRef: HTMLElement;
  let sigma: Sigma | undefined;
  let fa2Layout: FA2Layout | undefined;

  const dispatch = createEventDispatcher();

  const red = "#f87171";
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
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
      const pathB = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathB
      );

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
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
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
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
      if (pathA && node === pathA) {
        res.size = 10;
        res.zIndex = 2;
        res.color = orange;
        res.highlighted = true;
        res.size = $settings.bubbleSize * coCitationResults[node].measure;
        res.label = `${coCitationResults[node].measure} ${data.label}`;
      } else {
        res.color = red;
        res.size = maxSize(
          $settings.bubbleSize * adamicAdarResults[node].measure,
          32
        );
        res.label = `${adamicAdarResults[node].measure} ${data.label}`;
      }
    }

    return res;
  };

  let shortestNodePath: Array<string> | undefined | null;
  let shortestEdgePath: Array<string> | undefined | null;
  let adamicAdarResults: ResultMap | undefined;
  let coCitationResults: any;
  $: {
    if (
      sigma &&
      $settings.mode === Mode.ShortestPath &&
      $settings.pathA &&
      $settings.pathB
    ) {
      const graph = sigma.getGraph();
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
      const pathB = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathB
      );
      if (pathA && pathB) {
        if ($settings.directed) {
          shortestNodePath =
            dijkstra.bidirectional(graph, pathA, pathB) ||
            dijkstra.bidirectional(graph, pathB, pathA);
          if (shortestNodePath) {
            shortestEdgePath = edgePathFromNodePath(graph, shortestNodePath);
          } else {
            shortestNodePath = undefined;
            shortestEdgePath = undefined;
          }
        } else {
          const undirected = toUndirected(graph);

          shortestNodePath = dijkstra.bidirectional(undirected, pathA, pathB);
          if (shortestNodePath) {
            shortestEdgePath = [] as string[];
            for (let i = 0; i < shortestNodePath.length - 1; i++) {
              const edges = graph
                .directedEdges(shortestNodePath[i], shortestNodePath[i + 1])
                .concat(
                  graph.directedEdges(
                    shortestNodePath[i],
                    shortestNodePath[i + 1]
                  )
                );
              if (edges.length) {
                shortestEdgePath.push(edges[0]);
              }
            }
          } else {
            shortestNodePath = undefined;
            shortestEdgePath = undefined;
          }
        }
      } else {
        shortestNodePath = undefined;
        shortestEdgePath = undefined;
      }
    } else {
      shortestNodePath = undefined;
      shortestEdgePath = undefined;
    }
    if (sigma && $settings.mode === Mode.AdamicAdar && $settings.pathA) {
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
      if (pathA) {
        adamicAdarResults = adamicAdar(sigma.getGraph(), pathA);
        console.log(adamicAdarResults);
      } else {
        adamicAdarResults = undefined;
      }
    } else {
      adamicAdarResults = undefined;
    }
    if (sigma && $settings.mode === Mode.CoCitation && $settings.pathA) {
      const pathA = graph.findNode(
        (_, attrs) => attrs.label === $settings.pathA
      );
      if (pathA) {
        coCitationResults = coCitation(sigma.getGraph(), pathA, $settings.pathA);
        console.log("coCitationResults: ", coCitationResults);
      } else {
        coCitationResults = undefined;
      }
    } else {
      coCitationResults = undefined;
    }
  }

  const edgeReducer = (edge: string, data: Attributes) => {
    const res: Partial<EdgeDisplayData> = { ...data };
    if (
      sigma &&
      $settings.mode === Mode.ShortestPath &&
      shortestEdgePath?.includes(edge)
    ) {
      res.color = red;
      res.size = 5;
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
