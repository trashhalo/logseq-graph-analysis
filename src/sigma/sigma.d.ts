import Sigma from "sigma";
import type { Settings } from "sigma/settings";
import type Graph from "graphology";


/**
 * `ExtendedSettings` interface extends the base `Settings` interface
 * to include an additional parameters for rendering
 */
export interface ExtendedSettings extends Settings {

  /**
   * Specifies the background color of labels.
   * Accepts hex color string.
  */
  labelBackgroundColor: string;
  labelShadowColor: string;
}

/**
  * `ExtendedSigma` class extends the base `Sigma` class
  * to include an additional parameters for rendering
*/
export class ExtendedSigma extends Sigma {
  /**
     * @param settings - An optional `ExtendedSettings` object that includes
     *                   both the base `Settings` fields and the `labelBackgroundColor`.
   */

  constructor(graph: Graph, container: HTMLElement, settings?: Partial<ExtendedSettings>)
  setSetting<K extends keyof ExtendedSettings>(key: K, value: ExtendedSettings[K]): this;
}

