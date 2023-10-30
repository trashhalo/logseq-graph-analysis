# Logseq Graph Analysis

Learn more about the relationships between between your notes using network analysis algorithms.

![demo](./public/demo.gif)

## Installation

- Download a released version assets from Github.
- Unzip it.
- Click Load unpacked plugin, and select destination directory to the unzipped folder.

## Usage

- Click the graph icon to go into `graph analysis` mode.
- There are 3 modes to play with
  - Navigate - Clicking a node will open it in logseq to edit.
  - Shortest Path - Find the shortest path between 2 notes. Click a note to select it.
  - Adamic Adar - Find secret connections between your notes. Click a note to learn which notes the algorithm thinks are linked
  - CoCitation - Checks how alike documents are by looking at how close their shared references are
- Shift-click node to add it to sidebar
- If there are nodes you wish to hide from your graph add the page property `graph-hide:: true`
  - If you are interested in seeing suprising paths in your notes its a good idea to add this to notes that have lots of connections.

## Search and filters

https://github.com/trashhalo/logseq-graph-analysis/assets/19637629/6094b35c-2e0c-4026-8256-12c6329795d7

You can use Search to highlight page on grapg by title. `filter ` checkbox will keep only found pages + n neighbours

`Filters` allows you to color nodes by search query.

Both search and queries supports text search and regexp. Use `q: {your query}` to search using logseq quries

## Settings

- journal: show journal pages on your graph. may be slower. default false

## Development

1. yarn
2. yarn build
3. Load the unpacked plugin

## Icon

[Algorithm icons created by Becris - Flaticon](https://www.flaticon.com/free-icons/algorithm)

## Thank You

Huge thanks to [obsidian graph analysis](https://github.com/SkepticMystic/graph-analysis) for the inspiration and implementation of the adar algorithm!
