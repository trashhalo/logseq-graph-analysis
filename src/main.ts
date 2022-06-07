import "@logseq/libs";
import App from "./App.svelte";

function createModel() {
  return {
    async openStickyNotes() {
      logseq.showMainUI({
        autoFocus: true,
      });
    },
  };
}

async function main() {
  const app = new App({
    target: document.getElementById("app"),
  });

  logseq.setMainUIInlineStyle({
    position: "fixed",
    zIndex: 12,
  });

  logseq.App.registerUIItem("toolbar", {
    key: "logseq-sticky-notes",
    template: `
      <a class="button" data-on-click="openStickyNotes" title="Open sticky note mode">
        <svg style="width:24px;height:24px" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3,6V22H21V24H3A2,2 0 0,1 1,22V6H3M16,9H21.5L16,3.5V9M7,2H17L23,8V18A2,2 0 0,1 21,20H7C5.89,20 5,19.1 5,18V4A2,2 0 0,1 7,2M7,4V18H21V11H14V4H7Z" />
        </svg>
     </a>`,
  });
}

logseq.ready(createModel(), main).catch(() => console.error);
