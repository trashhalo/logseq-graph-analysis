<script lang="ts">
  import { graph, Mode, settings, store } from "../stores";
  import NodeFilter from "./components/NodeFilter.svelte";

  function handlShortestPathClear() {
    $settings.pathA = undefined;
    $settings.pathB = undefined;
  }
  function handleSearch(event) {
    if ($settings.filters[event.detail.id] != event.detail) {
      let filters = $settings.filters;
      filters[event.detail.id] = event.detail;
      $settings.filters = [...filters];
    }
  }
  function removeFilter(id) {
    $settings.filters = $settings.filters.filter((filter) => filter.id !== id);
  }

  function addFilter() {
    let id = 0;
    if ($settings.filters) {
      id = $settings.filters.length;
    }
    const newFilter = {
      id: id, // generate unique ID for new filter
      searchString: "",
      searchType: "color",
      searchColor: "#000000",
      foundNodeIds: [],
    };
    $settings.filters = [...$settings.filters, newFilter];
  }

  const modeTooltips = {
    [Mode.Navigate]: "Observe your graph. Click to open page, shift-click to open in side bar",
    [Mode.ShortestPath]: "Shortest path between two nodes",
    [Mode.AdamicAdar]: "Find secret connections between your notes",
    [Mode.CoCitation]: "Checks how alike documents are by looking at how close their shared references are",
  };
</script>

<div class="settings">
  <section>
  <div class="input-row" id="search">
    <input type="search" placeholder="Search"bind:value={$settings.search} />
  </div>
  <div class="input-row">
    <label for="filter">keep only found</label>
    <input type="checkbox" bind:checked={$settings.filter} />
  </div>
  {#if $settings.filter}
    <div class="input-row">
      <label for="nhops">n hops</label>
      <input
        type="range"
        min="1"
        step="1"
        max="10"
        bind:value={$settings.filterLength}
      />
    </div>
  {/if}
  </section>
  <section>
  <h2>Mode</h2>
  <div class="input-row">
    <select bind:value={$settings.mode}>
      {#each Object.entries(Mode) as [key, val]}
        <option value={val} title={modeTooltips[val]}>{val}</option>
      {/each}
    </select>
  </div>
  {#if $settings.mode === Mode.ShortestPath}
    <div class="input-row">
      <label for="directed">directed?</label>
      <input type="checkbox" bind:checked={$settings.directed} />
    </div>
    <div class="input-row">
      <label for="path">path a</label>
      <input type="search" bind:value={$settings.pathA} />
    </div>
    <div class="input-row">
      <label for="path">path b</label>
      <input type="search" bind:value={$settings.pathB} />
    </div>
  {/if}
  {#if $settings.mode === Mode.AdamicAdar || $settings.mode === Mode.CoCitation}
    <div class="input-row">
      <label for="path">path a</label>
      <input type="search" bind:value={$settings.pathA} />
    </div>
    <div class="input-row">
      <label for="bubbleSize">bubble size</label>
      <input
        type="range"
        min="0.01"
        step="0.1"
        max="10"
        bind:value={$settings.bubbleSize}
      />
    </div>
  {/if}
  </section>
  <section>
  <div>
    <div class="input-row">
      <h2>Filters</h2>
      <button on:click={addFilter}>+</button>
    </div>
    {#each $settings.filters as { id, searchString, searchType, searchColor, foundNodeIds } (id)}
      <div class="filter">
        <NodeFilter
          {id}
          {searchString}
          {searchColor}
          {searchType}
          {foundNodeIds}
          on:search={handleSearch}
          on:destroyed={() => removeFilter(id)}
        />
        <button on:click={() => removeFilter(id)}>&#x2715</button>
      </div>
      {:else}
      <p class="help-message">Hit plus button to add filters</p>
    {/each}
  </div>
  </section>
  <section>
  <h2> Display </h2>
  <div class="input-row">
    <label for="labelThreshold">Label threshold</label>
    <input
      type="range"
      min="0"
      step="0.05"
      max="10"
      bind:value={$settings.labelThreshold}
    />
  </div>
  <div class="input-row">
    <label for="gravity">Nodes gravity</label>
    <input
      type="range"
      min="0.01"
      step="0.01"
      max="20"
      bind:value={$settings.nodesGravity}
    />
  </div>
  <div class="input-row">
    <label for="scalingRatio">Scaling ratio</label>
    <input
      type="range"
      min="0.001"
      step="0.0001"
      max="1.5"
      bind:value={$settings.scalingRatio}
    />
  </div>
  <div class="input-row">
    <label for="edgeWeightInfluence">Edge weight impact</label>
    <input
      type="range"
      min="-2"
      step="0.1"
      max="2"
      bind:value={$settings.edgeWeightInfluence}
    />
  </div>
  {#if $settings.filter}
    <div class="input-row">
      <label for="nhops">n hops</label>
      <input
        type="range"
        min="1"
        step="1"
        max="10"
        bind:value={$settings.filterLength}
      />
    </div>
  {/if}
  <div class="input-row">
    <label for="size">Size</label>
    <select id="size" name="size" bind:value={$settings.size}>
      <option selected value="in">inbound links</option>
      <option value="out">outbound links</option>
    </select>
  </div>
  </section>
</div>

<style>
  h2 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
  }
  section {
    margin-bottom: 0.5rem;
  }
  .settings {
    position: fixed;
    top: 40px;
    right: 1vh;
    display: flex;
    flex-direction: column;
    border: 1px solid #a3a3a3;
    padding: 0.5rem;
    margin: 0;
    background-color: rgba(255, 255, 255, 0.8);
  }
  input[type=search] {
    tab-size: 4;
    word-break: break-word;
    border: 0 solid #e5e5e5;
    box-sizing: border-box;
    color: inherit;
    margin: 0;
    font: inherit;
    appearance: none;
    background-color: #fff;
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
  input[type=checkbox] {
    width: 1rem;
    height: 1rem;
    margin-right: 0.5rem;
  }
  select {
    width: 100%;
    height: 1.5rem;
    font-size: 0.8rem;
    border-radius: 0.25rem;
    border: 1px solid #e5e5e5;

  }
  select:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(164,202,254,.45);
    border-color: #2563eb;
  }
  label {
    font-size: 0.8rem;
    margin-right: 0.5rem;
    flex-shrink: 0;
  }
  button {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: 1px solid #e5e5e5;
    background-color: #2563eb;
    color: white;
    font-size: 0.8rem;
    margin-left: 0.5rem;
    flex-shrink: 0;
  }
  button:hover {
    background-color: #a3a3a3;
  }
  button:active {
    background-color: #2563eb;
  }
  .input-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .filter {
    display: flex;
    margin-bottom: 0.5rem;
  }
  .help-message {
    font-size: 0.8rem;
    color: #a3a3a3;
  }

</style>
