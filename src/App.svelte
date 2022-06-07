<script lang="ts">
  import { onMount } from "svelte";
  import Selecto from "svelte-selecto";
  import type { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
  import Note from "./Note.svelte";

  let blocks: Promise<[BlockEntity, any][]> = Promise.resolve([]);
  let uiVisible: boolean = false;
  let main: HTMLElement;

  const getBlockTuples = async (): Promise<[BlockEntity, any | null][]> => {
    const blocks = await logseq.Editor.getCurrentPageBlocksTree();
    return Promise.all(
      blocks.map(async (block) => [
        block,
        await logseq.Editor.getBlockProperties(block.uuid),
      ])
    );
  };

  onMount(() => {
    // @ts-ignore
    logseq.on("ui:visible:changed", async ({ visible }) => {
      uiVisible = visible;
    });
  });

  $: if (uiVisible) {
    blocks = getBlockTuples();
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key == "Escape") {
      logseq.hideMainUI();
    }
  };

  const handleDragEnd = async (
    event: CustomEvent<{
      block: [BlockEntity, any | null];
      x: number;
      y: number;
    }>
  ) => {
    await logseq.Editor.upsertBlockProperty(
      event.detail.block[0].uuid,
      "sticky-note-x",
      event.detail.x
    );
    await logseq.Editor.upsertBlockProperty(
      event.detail.block[0].uuid,
      "sticky-note-y",
      event.detail.y
    );
    let props = event.detail.block[1];
    if (!props) {
      props = {};
    }
    props["stickyNoteX"] = event.detail.x;
    props["stickyNoteY"] = event.detail.y;
    blocks = Promise.resolve(await blocks);
  };
</script>

<svelte:window on:keydown={handleKeydown} />
<Selecto
  boundContainer={main}
  selectableTargets={[".target"]}
  selectByClick={true}
  selectFromInside={false}
  on:selectStart={({ detail: e }) => {
    console.log("start", e);
    e.added.forEach((el) => {
      el.classList.add("selected");
    });
    e.removed.forEach((el) => {
      el.classList.remove("selected");
    });
  }}
  on:selectEnd={({ detail: e }) => {
    console.log("end", e);
    e.afterAdded.forEach((el) => {
      el.classList.add("selected");
    });
    e.afterRemoved.forEach((el) => {
      el.classList.remove("selected");
    });
  }}
/>

<main bind:this={main}>
  {#if uiVisible}
    {#await blocks then blocks}
      {#each blocks as block (block[0].uuid)}
        <Note {block} on:drag={handleDragEnd} />
      {/each}
    {/await}
  {/if}
</main>

<style>
  main {
    display: flex;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    justify-content: center;
    align-items: center;
    background: white;
  }
</style>
