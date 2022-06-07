<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { draggable } from "@neodrag/svelte";
  import type { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
  const dispatch = createEventDispatcher();

  export let block: [BlockEntity, any | null];
  let x: number = 0;
  if (block[1] && block[1]["stickyNoteX"]) {
    x = +block[1]["stickyNoteX"];
  }
  let y: number = 0;
  if (block[1] && block[1]["stickyNoteY"]) {
    y = +block[1]["stickyNoteY"];
  }

  console.log("Note", block[0].uuid, x, y, block[1]);

  const blockContent = (content: string) => {
    return content
      .split("\n")
      .filter((line: string) => line.indexOf(":: ") === -1)
      .join("\n");
  };
</script>

<div
  class="post-it-note target"
  use:draggable={{
    position: { x, y },
    onDragEnd: ({ offsetX, offsetY }) => {
      dispatch("drag", {
        block: block,
        x: offsetX,
        y: offsetY,
      });
    },
  }}
>
  <p>{blockContent(block[0].content)}</p>
</div>

<style>
  :root {
    --note-color: #fef9c3;
    --note-color-dark: #fef08a transparent;
  }

  p {
    font-family: helvetica;
    font-size: 1em;
    font-weight: bold;
  }

  .post-it-note {
    padding: 1em;
    background: var(--note-color);
    position: absolute;
    min-height: 2em;
    width: 6em;
    min-width: 3em;
    margin: 1em auto;
    box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
  }

  .post-it-note:after {
    content: "";
    position: absolute;
    bottom: -2em;
    left: 0;
    right: 2em;
    border-width: 1em;
    border-style: solid;
    border-color: var(--note-color);
  }

  .post-it-note:before {
    content: "";
    position: absolute;
    bottom: -2em;
    right: 0;
    border-width: 2em 2em 0 0;
    border-style: solid;
    border-color: var(--note-color-dark);
  }

  .post-it-note:global(.selected) {
    --note-color: #ccfbf1;
    --note-color-dark: #99f6e4 transparent;
  }
</style>
