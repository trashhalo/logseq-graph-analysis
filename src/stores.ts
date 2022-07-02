import { derived, get, Writable, writable } from "svelte/store";
import Graph from "graphology";
import random from "graphology-layout/random";

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
  aliases: Map<number, number>,
  pages: { id: number }[],
  ref: number
): Promise<number | undefined> {
  if (pages.find((p) => p.id === ref)) {
    return ref;
  }
  if (aliases.has(ref)) {
    return aliases.get(ref);
  }
  const block = await logseq.Editor.getBlock(ref);
  if (block && block.page) {
    const id = block.page.id;
    if (aliases.has(id)) {
      return aliases.get(id);
    } else {
      return id;
    }
  }
}
interface Page {
  id: number;
  "journal?": boolean;
  name: string;
  properties?: {
    graphHide?: boolean;
    alias?: string[];
  };
}

function pagesToAliasMap(pages: Page[]) {
  const aliases = new Map<number, number>();
  for (const page of pages) {
    if (page.properties && page.properties.alias) {
      const aliasedPages = page.properties.alias.map((a) =>
        pages.find((p) => p.name === a)
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

function removeAliases(aliases: Map<number, number>, pages: Page[]) {
  return pages.filter((p) => !aliases.has(p.id));
}

async function buildGraph(): Promise<Graph> {
  const g = new Graph();
  let pages: Page[] = await logseq.Editor.getAllPages();
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

    if (logseq.settings?.journal !== true && page["journal?"]) {
      continue;
    }

    const aliases: string[] = (page.properties?.alias ?? []).map((a) =>
      a.toUpperCase()
    );

    g.addNode(page.id, {
      label: page.name,
      aliases,
    });
  }

  const results: Block[][] = await logseq.DB.datascriptQuery(
    `[:find (pull ?b [*]) :in $ :where [?b :block/refs]]`
  );

  for (const block of results.flat()) {
    if (block.refs) {
      for (const ref of blockToReferences(
        logseq.settings?.journal === true,
        journals,
        block
      )) {
        const targetRef = await refToPageRef(aliases, pages, ref.target);
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
  directed: true,
});
