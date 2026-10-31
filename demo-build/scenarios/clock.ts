export class DemoClock {
  time = 0;
  paused = false;
  generation = 0;
  seekTo = 0;
  private jobs: { at: number; run: () => void }[] = [];
  reset() { this.generation++; this.time = 0; this.seekTo = 0; this.jobs = []; }
  schedule(run: () => void, ms: number) { this.jobs.push({ at: this.time + ms, run }); }
  advance(ms: number) {
    const end = this.time + ms;
    while (true) {
      this.jobs.sort((a, b) => a.at - b.at);
      if (!this.jobs.length || this.jobs[0].at > end) break;
      const job = this.jobs.shift()!;
      this.time = job.at; job.run();
    }
    this.time = end;
  }
  assert(generation: number) { if (generation !== this.generation) throw new Error('cancelled'); }
  async wait(ms: number, generation: number, progress: () => void, instant = false) {
    this.assert(generation);
    if (instant) { this.advance(ms); progress(); return; }
    let remaining = ms, last = performance.now();
    do {
      this.assert(generation);
      const now = performance.now();
      if (this.time < this.seekTo) {
        const delta = Math.min(remaining, this.seekTo - this.time);
        remaining -= delta; this.advance(delta); progress();
        if (remaining <= 0) return;
      }
      if (!this.paused) {
        const delta = Math.min(remaining, now - last);
        remaining -= delta;
        this.advance(delta); progress();
        if (remaining <= 0) return;
      }
      last = now;
      await new Promise(resolve => setTimeout(resolve, 25));
    } while (true);
  }
}
export const clock = new DemoClock();
