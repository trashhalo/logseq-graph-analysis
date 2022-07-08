<script lang="ts">
  import type Graph from "graphology";

  import { graph, Mode, settings } from "./stores";
  function handlShortestPathClear() {
    $settings.pathA = undefined;
    $settings.pathB = undefined;
  }

  function handleShortestPathRandom() {
    if ($graph) {
      $graph.then((graph) => {
        const nodes = graph.nodes().filter((node) => graph.degree(node));
        const pathA = nodes[Math.floor(Math.random() * nodes.length)];
        let pathB;
        if (nodes.length < 2) {
          pathB = pathA;
        } else {
          do {
            pathB = nodes[Math.floor(Math.random() * nodes.length)];
          } while (pathA === pathB);
        }
        if (pathA) {
          $settings.pathA = graph.getNodeAttribute(pathA, "label");
        }
        if (pathB) {
          $settings.pathB = graph.getNodeAttribute(pathB, "label");
        }
      });
    }
  }
</script>

<div class="settings">
  <div>
    <label for="search">search</label>
    <input type="text" bind:value={$settings.search} />
  </div>
  <div>
    <label for="size">size</label>
    <select id="size" name="size" bind:value={$settings.size}>
      <option selected value="in">inbound links</option>
      <option value="out">outbound links</option>
    </select>
    <div>
      <label for="nodeSize">node size</label>
      <input class="slider nodeSize" type="range" min="0.01" step="0.1" max="3" bind:value={$settings.nodeSize} />
    </div>
  </div>
  <hr />
  <div>
    <select bind:value={$settings.mode}>
      {#each Object.entries(Mode) as [key, val]}
        <option value={val}>{val}</option>
      {/each}
    </select>
  </div>
  {#if $settings.mode === Mode.ShortestPath}
    <div>
      <input type="submit" value="clear" on:click={handlShortestPathClear} />
      <input type="submit" value="random" on:click={handleShortestPathRandom} />
    </div>
    <div>
      <label for="directed">directed?</label>
      <input type="checkbox" bind:checked={$settings.directed} />
    </div>
    <div>
      <label for="path">path a</label>
      <input type="text" bind:value={$settings.pathA} />
    </div>
    <div>
      <label for="path">path b</label>
      <input type="text" bind:value={$settings.pathB} />
    </div>
  {/if}
  {#if $settings.mode === Mode.AdamicAdar || $settings.mode === Mode.CoCitation}
    <div>
      <label for="path">path a</label>
      <input type="text" bind:value={$settings.pathA} />
    </div>
    <div>
      <label for="bubbleSize">highlighted note size</label>
      <input class="slider highlightedNodeSize" type="range" min="0.01" step="0.1" max="10" bind:value={$settings.highlightedNodeSize} />
    </div>
  {/if}
</div>

<style>
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
  .slider {
    width: 100%;
    height: 1.5em;
    background: #fff;
    outline: none;
    opacity: 0.7;
    -webkit-transition: .2s;
    -webkit-appearance: none;
    transition: opacity .2s;
  }
  .slider:hover {
    opacity: 0.8;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    border-radius: 1.5em;
    border: 1px solid #b2b2b2;
    appearance: none;
    width: 1.5em;
    height: 1.5em;
    cursor: pointer;
    margin-top: -0.5em; 
    margin-bottom: -0.5em;
  }
  .slider::-webkit-slider-runnable-track {
    height: 0.7em;
    border: 1px solid #b2b2b2;
    border-radius: 0.5em;
  }
  .slider::-moz-range-thumb {
    width: 1.5em;
    height: 1.5em;
    cursor: pointer;
  }
  .nodeSize {color: grey;}
  .nodeSize::-webkit-slider-thumb {background: grey;}
  .nodeSize::-webkit-slider-runnable-track {background: lightgray;}
  .nodeSize::-moz-range-thumb {background: grey}
  .highlightedNodeSize {color: #f87171}
  .highlightedNodeSize::-webkit-slider-thumb {background: #f87171;}
  .highlightedNodeSize::-webkit-slider-runnable-track {background: #FFCCCC;}
  .highlightedNodeSize::-moz-range-thumb {background: #f87171}

</style>




