<script lang="ts">
  import { findNodes } from "../helpers/search";
  import { graph } from "@/stores";
  import { createEventDispatcher } from "svelte";
  import { onDestroy, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  export let id: number;
  export let searchString = "";
  let filterSearchResults = false;
  export let searchColor = "#000000";
  export let searchType = "color";
  export let foundNodeIds: String[] = [];

  function searchDispatch() {
    findNodes(searchString, $graph).then((res) => {
      foundNodeIds = res;
      dispatch("search", {
        id,
        searchString,
        searchColor,
        searchType,
        foundNodeIds,
      });
    });
  }

  function handleInput(event: Event) {
    searchDispatch();
  }

  $: {
    if ($graph) {
      searchDispatch();
    }
  }

  onMount(() => {
    // apply filter on load from saved config or any graph changes
    searchDispatch();
  });

  onDestroy(() => {
    dispatch("destroyed");
  });
</script>

<form class="search-input" on:input={handleInput}>
  <div>
    <input
      type="search"
      bind:value={searchString}
      placeholder="Search"
    />
  </div>
  {#if !filterSearchResults}
      <span> <input type="color" bind:value={searchColor} /> </span>
  {/if}
</form>

<style>
  form {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  .search-input input[type="text"] {
    flex-grow: 1;
    margin-right: 10px;
    width: 100%;
  }

  .search-input span:has(input[type="color"]) {
    height: 1.5em;
    width: 1.5em;
    overflow: hidden;
    border-radius: 50%;
    align-items: center;
    position: relative;
    display: flex;
  }

  .search-input input[type="color"] {
    position: absolute;
    height: 4em;
    width: 4em;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    border: none;
    margin: 0;
    padding: 0;
  }
  input[type=search] {
    tab-size: 4;
    word-break: break-word;
    border: 0 solid var(--theme-border-color);
    box-sizing: border-box;
    color: inherit;
    margin: 0;
    font: inherit;
    appearance: none;
    background-color: var(--theme-background-color);
    padding: .5rem .75rem;
    border-radius: .25rem;
    padding-left: .5rem;
    border-width: 1px;
    outline: 2px solid transparent;
    outline-offset: 2px;
    font-size: .75rem;
    line-height: 1rem;
    padding-bottom: .25rem;
    padding-top: .25rem;
    width: 100%;
  }
  input[type=search]:focus {
    box-shadow: 0 0 0 2px rgba(164,202,254,.45);
    border-color: #2563eb;
  }
</style>
