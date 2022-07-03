import Graph from "graphology";
import { toUndirected } from "graphology-operators";
import { dijkstra, edgePathFromNodePath } from "graphology-shortest-path";
import type { Attributes } from "graphology-types";

export function shortestPathDirected(
  graph: Graph,
  pathA: string,
  pathB: string
) {
  const nodes =
    dijkstra.bidirectional(graph, pathA, pathB) ||
    dijkstra.bidirectional(graph, pathB, pathA);
  if (nodes) {
    const edges = edgePathFromNodePath(graph, nodes);
    return { nodes, edges } as const;
  } else {
    return { nodes: undefined, edges: undefined } as const;
  }
}

export function shortestPathUndirected(
  graph: Graph,
  pathA: string,
  pathB: string
) {
  const undirected = toUndirected(graph);

  const nodes = dijkstra.bidirectional(undirected, pathA, pathB);
  if (nodes) {
    const edges = [] as string[];
    for (let i = 0; i < nodes.length - 1; i++) {
      const directedEdges = graph
        .directedEdges(nodes[i], nodes[i + 1])
        .concat(graph.directedEdges(nodes[i], nodes[i + 1]));
      if (directedEdges.length) {
        edges.push(directedEdges[0]);
      }
    }
    return { nodes, edges } as const;
  } else {
    return { nodes: undefined, edges: undefined } as const;
  }
}

export function shortestPathEdgePredicate(
  edges: string[] | undefined | null,
  edge: string
) {
  return edges?.includes(edge);
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("shortestPathDirected", () => {
    it("returns directed paths", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");
      const { nodes, edges } = shortestPathDirected(graph, "A", "C");
      expect(nodes).toMatchObject(["A", "B", "C"]);
      expect(edges).toMatchObject([graph.edge("A", "B"), graph.edge("B", "C")]);
    });

    it("returns directed paths even if backwards", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      graph.addEdge("B", "C");
      const { nodes, edges } = shortestPathDirected(graph, "C", "A");
      expect(nodes).toMatchObject(["A", "B", "C"]);
      expect(edges).toMatchObject([graph.edge("A", "B"), graph.edge("B", "C")]);
    });

    it("will not return undirected paths", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      graph.addEdge("C", "B");
      const { nodes, edges } = shortestPathDirected(graph, "C", "A");
      expect(nodes).toBeUndefined();
      expect(edges).toBeUndefined();
    });

    it("will not return disconnected paths", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      const { nodes, edges } = shortestPathDirected(graph, "A", "C");
      expect(nodes).toBeUndefined();
      expect(edges).toBeUndefined();
    });
  });

  describe("shortestPathUndirected", () => {
    it("will return undirected paths", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      graph.addEdge("C", "B");
      const { nodes, edges } = shortestPathUndirected(graph, "A", "C");
      expect(nodes).toMatchObject(["A", "B", "C"]);
      expect(edges).toMatchObject([graph.edge("A", "B"), graph.edge("C", "B")]);
    });

    it("will not return disconnected paths", () => {
      const graph = new Graph();
      graph.addNode("A");
      graph.addNode("B");
      graph.addNode("C");
      graph.addEdge("A", "B");
      const { nodes, edges } = shortestPathUndirected(graph, "A", "C");
      expect(nodes).toBeUndefined();
      expect(edges).toBeUndefined();
    });
  });
}
