/*
taken from https://github.com/SkepticMystic/graph-analysis
https://raw.githubusercontent.com/SkepticMystic/graph-analysis/master/LICENSE
*/

import type Graph from "graphology";

const DECIMALS = 4;

function intersection(nodes1: string[], nodes2: string[]) {
  return nodes1?.filter((node1) => nodes2.includes(node1)) ?? [];
}

function roundNumber(num: number, dec: number = DECIMALS): number {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function sum(arr: number[]) {
  if (arr.length === 0) {
    return 0;
  }
  return arr.reduce((a, b) => a + b);
}

export interface ResultMap {
  [to: string]: { measure: number; extra: string[] };
}

export function adamicAdar(graph: Graph, node: string) {
  const results: ResultMap = {};
  const Na = graph.neighbors(node);

  graph.forEachNode((to) => {
    const Nb = graph.neighbors(to);
    const Nab = intersection(Na, Nb);
    let measure = Infinity;
    if (Nab.length) {
      const neighbours: number[] = Nab.map((n) => graph.outNeighbors(n).length);
      measure = roundNumber(
        sum(neighbours.map((neighbour) => 1 / Math.log(neighbour)))
      );
    }
    results[to] = { measure, extra: Nab };
  });
  return Object.fromEntries(
    Object.entries(results).filter(
      ([key, val]) => val.measure !== 0 && Number.isFinite(val.measure)
    )
  );
}
