import { derived, get, Writable, writable } from "svelte/store";
import Graph from "graphology";
import random from "graphology-layout/random";
import type { PageEntity } from "@logseq/libs/dist/LSPlugin.user";

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
}

interface Store {
  uiVisibile: boolean;
  graph?: Promise<Graph>;
}

interface Block {
  refs: { id: number }[];
  "path-refs": { id: number }[];
  page: { id: number };
}

interface Reference {
  source: number;
  target: number;
}

function blockToReferences(block: Block): Reference[] {
  const targets = block.refs;
  const pathsWithoutTargets = block["path-refs"].filter(
    (p) => !targets.map((p) => p.id).includes(p.id) && p.id !== block.page.id
  );
  let source = block.page;
  if (pathsWithoutTargets.length > 0) {
    source = pathsWithoutTargets[pathsWithoutTargets.length - 1];
  }
  return targets.map((target) => ({
    source: source.id,
    target: target.id,
  }));
}

async function buildGraph(): Promise<Graph> {
  const g = new Graph();
  const pages: {
    id: number;
    "journal?": boolean;
    name: string;
    properties?: { graphHide?: boolean };
  }[] = await logseq.Editor.getAllPages();
  for (const page of pages) {
    if (page.properties && page.properties.graphHide) {
      continue;
    }
    if (g.hasNode(page.id)) {
      continue;
    }
    if (page["journal?"]) {
      continue;
    }

    g.addNode(page.id, {
      label: page.name,
    });
  }

  const results: Block[][] = await logseq.DB.datascriptQuery(
    `[:find (pull ?b [*]) :in $ :where [?b :block/refs]]`
  );

  for (const block of results.flat()) {
    if (block.refs) {
      for (const ref of blockToReferences(block)) {
        if (g.hasNode(ref.source) && g.hasNode(ref.target)) {
          if (!g.hasEdge(ref.source, ref.target)) {
            g.addEdge(ref.source, ref.target, { weight: 1 });
          } else {
            g.updateDirectedEdgeAttribute(
              ref.source,
              ref.target,
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
        graph: buildGraph(),
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
});
