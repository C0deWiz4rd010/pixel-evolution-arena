import type { Ticker } from 'pixi.js';

/** Ambient idle animation (bobbing, glows) looks the same at 30 fps and halves the GPU work. */
const IDLE_FPS = 30;

/**
 * Keeps a Pixi ticker as cheap as possible: full frame rate only while something important is
 * animating, a capped rate for ambient motion, and fully stopped when the canvas is scrolled
 * out of view or reduced motion is active.
 */
export class PixiTickerGovernor {
  private visible = true;
  private readonly observer: IntersectionObserver | null;

  constructor(
    private readonly ticker: Ticker,
    host: HTMLElement,
    private readonly isReduced: () => boolean,
  ) {
    this.ticker.maxFPS = IDLE_FPS;
    this.observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            this.visible = entry?.isIntersecting ?? true;
            this.sync();
          });
    this.observer?.observe(host);
    this.sync();
  }

  /** Busy = a battle beat or transition is playing and deserves the full frame rate. */
  setBusy(busy: boolean): void {
    this.ticker.maxFPS = busy ? 0 : IDLE_FPS;
  }

  /** Start or stop the ticker to match visibility and motion preference. */
  sync(): void {
    if (this.isReduced() || !this.visible) {
      this.ticker.stop();
    } else {
      this.ticker.start();
    }
  }

  dispose(): void {
    this.observer?.disconnect();
  }
}
