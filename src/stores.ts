import { derived, Writable, writable } from "svelte/store";
import { buildGraph } from "./graph";
import type Graph from "graphology";

type SettingsSize = "in" | "out";
export enum Mode {
  Navigate = "Navigate",
  ShortestPath = "Shortest Path",
  AdamicAdar = "Adamic Adar",
  CoCitation = "CoCitation",
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
  filter: boolean;
  filterLength: number;
}

interface Store {
  uiVisibile: boolean;
  graph?: Promise<Graph>;
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
  filter: false,
  filterLength: 3,
});
