import type {
  BlockEntity,
  BlockIdentity,
  EntityID,
} from "@logseq/libs/dist/LSPlugin";
import Graph from "graphology";
import random from "graphology-layout/random";
import { singleSourceLength } from "graphology-shortest-path";
import { toUndirected } from "graphology-operators";
import {
  blockToReferences,
  refToPageRef,
  Page,
  Block,
  getBlockFn,
} from "./logseq";

type getAllPagesFn = () => Promise<Page[]>;
type getBlockReferencesFn = () => Promise<Block[][]>;
type getSettingsFn = () => { journal: boolean };

export async function buildGraph(
  getAllPages: getAllPagesFn,
  getBlockReferences: getBlockReferencesFn,
  getSettings: getSettingsFn,
  getBlock: getBlockFn
): Promise<Graph> {
  console.log("building graph");

  const g = new Graph();
  let pages = await getAllPages();
  const aliases = pagesToAliasMap(pages);
  pages = removeAliases(aliases, pages);
  const journals = pages.filter((p) => p["journal?"]);

  for (const page of pages) {
    if (page.properties && page.properties.graphHide) {
      continue;
    }
    if (g.hasNode(page.id)) {
      continue;
    }

    if (getSettings().journal !== true && page["journal?"]) {
      continue;
    }

    const icon = page.properties?.icon || page.properties?.pageIcon;

    g.addNode(page.id, {
      ...(icon
        ? {
            type: "image",
            image: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='1.1em' x='0.2em' font-size='70'>${icon}</text></svg>`,
          }
        : {
            type: "circle",
          }),
      label: page.name,
      aliases: pageToAliases(page, true),
      rawAliases: pageToAliases(page, false),
    });
  }

  const results = await getBlockReferences();

  for (const block of results.flat()) {
    if (block.refs) {
      for (const ref of blockToReferences(
        getSettings().journal === true,
        journals,
        block
      )) {
        const targetRef = await refToPageRef(
          getBlock,
          aliases,
          pages,
          ref.target
        );
        if (targetRef && g.hasNode(ref.source) && g.hasNode(targetRef)) {
          if (!g.hasEdge(ref.source, targetRef)) {
            g.addEdge(ref.source, targetRef, { weight: 1 });
          } else {
            g.updateDirectedEdgeAttribute(
              ref.source,
              targetRef,
              "weight",
              (weight) => weight + 1
            );
          }
        }
      }
    }
  }

  random.assign(g);

  return g;
}

export function pagesToAliasMap(pages: Page[]): Map<number, number> {
  const aliases = new Map<number, number>();
  for (const page of pages) {
    if (page.properties && page.properties.alias) {
      const aliasedPages = page.properties.alias.map((a) =>
        pages.find((p) => p.name.toUpperCase() === a.toUpperCase())
      );
      for (const alias of aliasedPages) {
        if (alias) {
          aliases.set(alias.id, page.id);
        }
      }
    }
  }
  return aliases;
}

export function removeAliases(
  aliases: Map<number, number>,
  pages: Page[]
): Page[] {
  return pages.filter((p) => !aliases.has(p.id));
}

export function pageToAliases(page: Page, upper: boolean): string[] {
  return (page.properties?.alias ?? []).map((a) =>
    upper ? a.toUpperCase() : a
  );
}

export function findNode(graph: Graph, name?: string): string | undefined {
  if (!name) {
    return undefined;
  }
  const up = name.toUpperCase();
  return graph.findNode((_node, attrs) => {
    return (
      attrs.label.toUpperCase() === up ||
      (attrs.aliases && attrs.aliases.includes(up))
    );
  });
}

export function nodeNameIndex(graph: Graph): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of graph.nodeEntries()) {
    map.set(node.attributes.label.toUpperCase(), node.node);
    if (node.attributes.aliases) {
      for (const alias of node.attributes.aliases) {
        map.set(alias.toUpperCase(), node.node);
      }
    }
  }
  return map;
}

export function filter(
  graph: Graph,
  search: string
): (node: string, searchLen: number) => boolean {
  const undirected = toUndirected(graph);
  const map = new Map<string, number>();
  for (const node of graph.nodeEntries()) {
    const label = node.attributes.label.toUpperCase();
    const searchUp = search.toUpperCase();
    if (label.includes(searchUp)) {
      const len = singleSourceLength(undirected, node.node);
      for (const [key, val] of Object.entries(len)) {
        const cur = map.get(key);
        if (!cur || cur > val) {
          map.set(key, val);
        }
      }
    }
  }
  console.log(map);
  return (node, searchLen) => {
    const len = map.get(node);
    if (len === undefined) {
      return true;
    }
    return searchLen <= len;
  };
}

if (import.meta.vitest) {
  const { it, expect, describe, vi } = import.meta.vitest;
  describe("buildGraph", () => {
    function graphToJson(graph: Graph) {
      const json = graph.toJSON();
      json.edges.forEach((e) => {
        delete e.key;
      });
      json.nodes.forEach((n: any) => {
        delete n.key;
        delete n.attributes.x;
        delete n.attributes.y;
      });
      return json;
    }

    it("creates a graph with edges", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": false, name: "B" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("increases the weight for multiple edges", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": false, name: "B" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("shows journal pages when requested", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": true, name: "B" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: true });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("does not shows journal pages when not requested", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": true, name: "B" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("links graphs to nested parents", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": false, name: "B" },
        { id: 3, "journal?": false, name: "C" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
          {
            refs: [{ id: 3 }],
            "path-refs": [{ id: 1 }, { id: 2 }, { id: 3 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("handles block references", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": false, name: "B" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 3 }],
            "path-refs": [{ id: 1 }, { id: 3 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = vi
        .fn()
        .mockImplementationOnce(() => ({ page: { id: 2 } } as BlockEntity));
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(getBlock).toBeCalledWith(3);
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("skips references to journal pages", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": true, name: "B" },
        { id: 3, "journal?": false, name: "C" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
          {
            refs: [{ id: 3 }],
            "path-refs": [{ id: 1 }, { id: 2 }, { id: 3 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("skips pages with graph-hide: true", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        {
          id: 2,
          "journal?": false,
          name: "B",
          properties: { graphHide: true },
        },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 1 }, { id: 2 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("merges alias nodes", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A", properties: { alias: ["B"] } },
        { id: 2, "journal?": false, name: "B" },
        { id: 3, "journal?": false, name: "C" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }],
            "path-refs": [{ id: 3 }, { id: 2 }],
            page: { id: 3 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });

    it("links shared references in a block", async () => {
      const getAllPages = async () => [
        { id: 1, "journal?": false, name: "A" },
        { id: 2, "journal?": false, name: "B" },
        { id: 3, "journal?": false, name: "C" },
      ];
      const getBlockReferences = async () => [
        [
          {
            refs: [{ id: 2 }, { id: 3 }],
            "path-refs": [{ id: 1 }, { id: 2 }, { id: 3 }],
            page: { id: 1 },
          },
        ],
      ];
      const getSettings = () => ({ journal: false });
      const getBlock = async (ref: BlockIdentity | EntityID) => null;
      const graph = await buildGraph(
        getAllPages,
        getBlockReferences,
        getSettings,
        getBlock
      );
      expect(graphToJson(graph)).toMatchSnapshot();
    });
  });
}
