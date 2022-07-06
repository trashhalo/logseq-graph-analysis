/*
taken from https://github.com/SkepticMystic/graph-analysis
https://raw.githubusercontent.com/SkepticMystic/graph-analysis/master/LICENSE
*/

import type Graph from "graphology";
import type { Attributes } from "graphology-types";
import { findNode } from "./graph";

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

// Simplified version of CoCitation analysis
// Original implementation and SkepticMystic Obsidian plugin look at proximity of links.
// The version below just takes links pointing at same information at block level
// See here for original article: https://isg.beel.org/pubs/Citation%20Proximity%20Analysis%20(CPA)%20-%20A%20new%20approach%20for%20identifying%20related%20work%20based%20on%20Co-Citation%20Analysis%20--%20preprint.pdf

export const coCitation = async (graph: Graph, node: Attributes) => {
  const logseqQuery = (name: string) => `[
    :find ?b ?page 
    :where 
      [?b :block/path-refs ?link]
      [?link :block/name "${name}"]
      [?b :block/path-refs ?otherlinks]
      [?otherlinks :block/name ?page]
    ]`;
  const attrs = graph.getNodeAttributes(node);
  const queryResults = await Promise.all(
    [attrs.label, ...attrs.rawAliases].map((n) =>
      logseq.DB.datascriptQuery(logseqQuery(n))
    )
  );
  console.log(queryResults);

  // group links by frequency
  const counter: { [key: string]: number } = {};
  for (const link of queryResults.flat()) {
    const key = findNode(graph, link[1]);
    if (!key) {
      continue;
    }
    counter[key] ? (counter[key] += 1) : (counter[key] = 1);
  }

  // get highest frequency and normalize
  const maxVal = Math.max(...Object.values(counter));
  const results: any = {};
  for (const key of Object.keys(counter)) {
    results[key] = {
      measure: roundNumber((10 * counter[key]) / maxVal),
      extra: ["1"],
    };
  }
  return results;
};
