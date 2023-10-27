import type {
  BlockEntity,
  BlockIdentity,
  EntityID,
} from "@logseq/libs/dist/LSPlugin";

export interface Page {
  id: number;
  "journal?": boolean;
  name: string;
  properties?: {
    graphHide?: boolean;
    alias?: string[] | string;
    icon?: string;
    pageIcon?: string;
  };
}

export interface Block {
  refs: { id: number }[];
  "path-refs"?: { id: number }[];
  page: { id: number };
}

export interface Reference {
  source: number;
  target: number;
}

export type getBlockFn = (
  srcBlock: BlockIdentity | EntityID,
  opts?: Partial<{
    includeChildren: boolean;
  }>
) => Promise<BlockEntity | null>;

export function blockToReferences(
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
  const refs = targets.map((target) => ({
    source: source.id,
    target: target.id,
  }));
  const sharedRefs = targets.flatMap((source, i) =>
    [...targets.slice(0, i), ...targets.slice(i + 1)].map((target) => ({
      source: source.id,
      target: target.id,
      undirected: true,
    }))
  );
  return refs.concat(sharedRefs);
}

export async function refToPageRef(
  getBlock: getBlockFn,
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
  const block = await getBlock(ref);
  if (block && block.page) {
    const id = block.page.id;
    if (aliases.has(id)) {
      return aliases.get(id);
    } else {
      return id;
    }
  }
}
