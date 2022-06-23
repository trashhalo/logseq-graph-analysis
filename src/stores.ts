import type { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { derived, Readable, writable, get } from "svelte/store";


interface Store {
  uiVisibile: boolean;
}

function createStore() {
  const { subscribe, update } = writable<Store>({
    uiVisibile: false,
  });

  return {
    subscribe,
    visible: (visible: boolean) => {
        update((cur) => ({ ...cur, uiVisibile: visible }));
    },
  };
}
export const store = createStore();
export const uiVisible = derived(store, (store) => store.uiVisibile);