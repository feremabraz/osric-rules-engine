// CE-04 Effects Buffer
// Simple append-only buffer collecting effects during command execution.
// Drain returns an immutable snapshot and clears internal storage.

import type { Effect } from './result';

export class EffectsBuffer {
  private list: Effect[] = [];

  add(type: string, target: string, payload?: unknown): void {
    const effect: Effect = payload === undefined ? { type, target } : { type, target, payload };
    this.list.push(effect);
  }

  drain(): readonly Effect[] {
    const snapshot = Object.freeze(this.list.slice());
    this.list.length = 0;
    return snapshot;
  }

  size(): number {
    return this.list.length;
  }
  isEmpty(): boolean {
    return this.list.length === 0;
  }
}
