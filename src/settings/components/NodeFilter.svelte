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
      type="text"
      bind:value={searchString}
      placeholder="Search..."
    />
  </div>
  {#if !filterSearchResults}
    <label>
      <input type="color" bind:value={searchColor} />
    </label>
  {/if}
</form>

<style>
  .search-input {
    display: flex;
    align-items: center;
  }

  .search-input input[type="text"] {
    flex-grow: 1;
    margin-right: 10px;
  }

  .search-input label {
    display: flex;
    align-items: center;
    margin-right: 10px;
  }

  .search-input input[type="color"] {
    border: none;
    outline: none;
    border-radius: 50%;
    padding: 0;
  }
</style>
