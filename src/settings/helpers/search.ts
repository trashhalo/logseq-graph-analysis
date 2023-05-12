import type Graph from "graphology";
import type { Attributes } from "graphology-types";

export async function findNodes(query: string | undefined, graph: Graph) {
  let foundNodeIds: string[] = []
  if (query === undefined || query === "") {
    return foundNodeIds
  }
  if (query.startsWith("q:")) {
    try {
      const res = await logseq.DB.q(query.slice(2).toLowerCase());
      if (res) {
        foundNodeIds = res.map((r) => r.page.id.toString());
      }
    } catch {
      console.log("error in query");
    }
  } else {
    foundNodeIds = graph.filterNodes(
      (node: string, data: Attributes) =>
        data.label?.match(query) ||
        data["aliases"]?.find((a: string) =>
          a.toUpperCase().match(query.toUpperCase())
        )
    );
  }
  return foundNodeIds;
}

