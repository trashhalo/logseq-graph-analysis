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
      <label for="path">path a</label>
      <input type="text" bind:value={$settings.pathA} />
    </div>
    <div>
      <label for="path">path b</label>
      <input type="text" bind:value={$settings.pathB} />
    </div>
  {/if}
  {#if $settings.mode === Mode.AdamicAdar}
    <div>
      <label for="path">path a</label>
      <input type="text" bind:value={$settings.pathA} />
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
</style>
