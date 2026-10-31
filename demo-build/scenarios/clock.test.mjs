import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoClock } from './clock.ts';

test('scheduled effects run in time order, including chained effects', () => {
  const clock = new DemoClock(), seen = [];
  clock.schedule(() => { seen.push(clock.time); clock.schedule(() => seen.push(clock.time), 10); }, 20);
  clock.schedule(() => seen.push(clock.time), 10);
  clock.advance(100);
  assert.deepEqual(seen, [10, 20, 30]);
  assert.equal(clock.time, 100);
});

test('reset cancels an old generation and removes its pending effects', async () => {
  const clock = new DemoClock();
  let ran = false;
  clock.schedule(() => { ran = true; }, 50);
  clock.paused = true;
  const pending = assert.rejects(clock.wait(50, clock.generation, () => {}), /cancelled/);
  clock.reset();
  await pending;
  clock.advance(100);
  assert.equal(ran, false);
});

test('pause freezes both time and effects until resumed', async () => {
  const clock = new DemoClock();
  clock.paused = true;
  let ran = false;
  clock.schedule(() => { ran = true; }, 10);
  const pending = clock.wait(30, clock.generation, () => {});
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(clock.time, 0);
  assert.equal(ran, false);
  clock.paused = false;
  await pending;
  assert.equal(clock.time, 30);
  assert.equal(ran, true);
});

test('seeking fast-forwards to the exact requested time even while paused', async () => {
  const clock = new DemoClock();
  clock.paused = true; clock.seekTo = 40;
  const pending = clock.wait(100, clock.generation, () => {});
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(clock.time, 40);
  clock.paused = false;
  await pending;
  assert.equal(clock.time, 100);
});
