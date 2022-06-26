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

type Block = { refs: { id: number }[]; page: { id: number } };

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
      for (const ref of block.refs) {
        if (g.hasNode(block.page.id) && g.hasNode(ref.id)) {
          if (!g.hasEdge(block.page.id, ref.id)) {
            g.addEdge(block.page.id, ref.id, { weight: 1 });
          } else {
            g.updateDirectedEdgeAttribute(
              block.page.id,
              ref.id,
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
