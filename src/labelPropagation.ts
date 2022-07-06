import type Graph from "graphology";
import { toUndirected } from "graphology-operators";
import { singleSourceLength } from "graphology-shortest-path";
import * as chroma from "chroma-js";

export function labelPropagation(
  graph: Graph,
  labelArr: string[],
  colors: { red: string; green: string; blue: string; yellow: string },
  size: number
): (node: string) => string {
  const base = chroma("white");
  const palette = [
    chroma(colors.red),
    chroma(colors.green),
    chroma(colors.blue),
    chroma(colors.yellow),
  ];
  const undirected = toUndirected(graph);
  const index = new Map(
    labelArr.map((label) => [label, singleSourceLength(undirected, label)])
  );
  return (node) => {
    if (labelArr.includes(node)) {
      return palette[labelArr.indexOf(node)].hex();
    }

    let color = base;
    for (const [idx, label] of labelArr.entries()) {
      const map = index.get(label)!;
      const len = map[node];
      if (len) {
        const amount = Math.max(1 - len / size, 0);
        color = chroma.mix(color, palette[idx], amount, "lab");
      }
    }
    return color.hex();
  };
}
