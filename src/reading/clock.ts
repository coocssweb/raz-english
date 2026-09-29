import type { ActiveInterval } from './types';
export function localDate(ms: number) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
type Sample = { monoMs: number; wallMs: number; visible: boolean; playing: boolean; interaction: boolean };
export class ReadingClock {
  private previous: Sample | undefined;
  private lastInteraction = -Infinity;
  sample(input: Sample): ActiveInterval[] {
    const old = this.previous; const result: ActiveInterval[] = [];
    if (old) {
      const delta = input.monoMs - old.monoMs; const wallDelta = input.wallMs - old.wallMs;
      if (delta > 0 && delta <= 10000 && wallDelta >= 0 && Math.abs(wallDelta - delta) < 2000 && old.visible) {
        const length = old.playing ? delta : Math.max(0, Math.min(delta, this.lastInteraction + 60000 - old.monoMs));
        let start = old.wallMs; const end = start + length;
        while (start < end) { const d = new Date(start); const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); const stop = Math.min(end, midnight); result.push({ startMs: start, endMs: stop, localDate: localDate(start) }); start = stop; }
      }
    }
    if (input.interaction) this.lastInteraction = input.monoMs;
    this.previous = input; return result;
  }
}
