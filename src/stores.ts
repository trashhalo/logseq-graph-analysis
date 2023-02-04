import { derived, Writable, writable } from "svelte/store";
import { buildGraph } from "./graph";
import Graph from "graphology";
import type { Camera } from "sigma";

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
  mode: Mode;
  directed: boolean;
  bubbleSize: number;
  filter: boolean;
  filterLength: number;
  cameraState?: ReturnType<Camera["getState"]>;
  labelThreshold: number;
  nodesGravity: number;
  scalingRatio: number;
  edgeWeightInfluence: number;
}

interface Store {
  uiVisibile: boolean;
  graph: Graph;
}

function createStore() {
  const { subscribe, update } = writable<Store>({
    uiVisibile: false,
    graph: new Graph(),
  });

  return {
    subscribe,
    update,
    visible: (visible: boolean) => {
      update((cur) => ({
        ...cur,
        uiVisibile: visible,
      }));
    },
    reload: () => {
      settings.update((settings) => {
        settings.cameraState = undefined;
        return settings;
      });
      buildGraph(
        () => logseq.Editor.getAllPages(),
        () =>
          logseq.DB.datascriptQuery(
            `[:find (pull ?b [*]) :in $ :where [?b :block/refs]]`
          ),
        () => ({ journal: logseq.settings?.journal === true }),
        (ref) => logseq.Editor.getBlock(ref)
      ).then((graph) => {
        update((cur) => ({
          ...cur,
          graph,
        }));
      });
    },
  };
}

export const store = createStore();
export const uiVisible = derived(store, (store) => store.uiVisibile);
export const graph = derived(store, (store) => store.graph);

export const settings: Writable<Settings> = writable({
  size: "in",
  mode: Mode.Navigate,
  directed: true,
  bubbleSize: 5,
  filter: false,
  filterLength: 3,
  labelThreshold: 1,
  nodesGravity: 1,
  scalingRatio: 1,
  edgeWeightInfluence: 0.5,
});
