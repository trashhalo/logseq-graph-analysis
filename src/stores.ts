import { derived, get, Writable, writable } from "svelte/store";
import Graph from "graphology";
import random from "graphology-layout/random";
import type {
  BlockEntity,
  BlockIdentity,
  EntityID,
} from "@logseq/libs/dist/LSPlugin";

type SettingsSize = "in" | "out";
export enum Mode {
  Navigate = "Navigate",
  ShortestPath = "Shortest Path",
  AdamicAdar = "Adamic Adar",
}

interface Settings {
  size: SettingsSize;
  search?: string;
  pathA?: string;
  pathB?: string;
  gravity: number;
  mode: Mode;
  directed: boolean;
  bubbleSize: number;
}

interface Store {
  uiVisibile: boolean;
  graph?: Promise<Graph>;
}

interface Block {
  refs: { id: number }[];
  "path-refs": { id: number }[] | undefined;
  page: { id: number };
}

interface Reference {
  source: number;
  target: number;
}

function blockToReferences(
  getBlock: getBlockFn,
  journalsEnabled: boolean,
  journals: Page[],
  block: Block
): Reference[] {
  const targets = block.refs;
  const targetIds = targets.map((p) => p.id);
  let pathsWithoutTargets = [] as { id: number }[];
  for (const ref of block["path-refs"] ?? []) {
    const targetIsJournal = !!journals.find((j) => j.id === ref.id);
    if (!journalsEnabled && targetIsJournal) {
      continue;
    }
    if (ref.id === block.page.id) {
      continue;
    }
    if (targetIds.includes(ref.id)) {
      continue;
    }
    pathsWithoutTargets.push(ref);
  }

  let source = block.page;
  if (pathsWithoutTargets.length > 0) {
    source = pathsWithoutTargets[pathsWithoutTargets.length - 1];
  } else {
    source = block.page;
  }
  return targets.map((target) => ({
    source: source.id,
    target: target.id,
  }));
}

async function refToPageRef(
  getBlock: getBlockFn,
  pages: { id: number }[],
  ref: number
): Promise<number | undefined> {
  if (pages.find((p) => p.id === ref)) {
    return ref;
  }
  const block = await getBlock(ref);
  if (block && block.page) {
    return block.page.id;
  }
}
interface Page {
  id: number;
  "journal?": boolean;
  name: string;
  properties?: { graphHide?: boolean };
}

type getAllPagesFn = () => Promise<Page[]>;
type getBlockReferencesFn = () => Promise<Block[][]>;
type getSettingsFn = () => { journal: boolean };
type getBlockFn = (
  srcBlock: BlockIdentity | EntityID,
  opts?: Partial<{
    includeChildren: boolean;
  }>
) => Promise<BlockEntity | null>;

async function buildGraph(
  getAllPages: getAllPagesFn,
  getBlockReferences: getBlockReferencesFn,
  getSettings: getSettingsFn,
  getBlock: getBlockFn
): Promise<Graph> {
  const g = new Graph();
  const pages = await getAllPages();

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

    g.addNode(page.id, {
      label: page.name,
    });
  }

  const results = await getBlockReferences();

  for (const block of results.flat()) {
    if (block.refs) {
      for (const ref of blockToReferences(
        getBlock,
        getSettings().journal === true,
        journals,
        block
      )) {
        const targetRef = await refToPageRef(getBlock, pages, ref.target);
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

function createStore() {
  const { subscribe, update } = writable<Store>({
    uiVisibile: false,
  });

  return {
    subscribe,
    visible: (visible: boolean) => {
      update((cur) => ({
        ...cur,
        uiVisibile: visible,
      }));
    },
    reload: () => {
      update((cur) => ({
        ...cur,
        graph: buildGraph(
          () => logseq.Editor.getAllPages(),
          () =>
            logseq.DB.datascriptQuery(
              `[:find (pull ?b [*]) :in $ :where [?b :block/refs]]`
            ),
          () => ({ journal: logseq.settings?.journal === true }),
          (ref) => logseq.Editor.getBlock(ref)
        ),
      }));
    },
  };
}

export const store = createStore();
export const uiVisible = derived(store, (store) => store.uiVisibile);
export const graph = derived(store, (store) => store.graph);

export const settings: Writable<Settings> = writable({
  size: "in",
  gravity: 0.05,
  mode: Mode.Navigate,
  directed: true,
  bubbleSize: 5,
});

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
  });
}
