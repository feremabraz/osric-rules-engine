import type { Engine } from '../engine/Engine';
import type { CommandResultShape } from '../types/commandResults';

export interface BatchStep<K extends keyof CommandResultShape & string = string> {
  command: K | string;
  params: unknown;
  assign?: string;
  optional?: boolean; // ignored by plain batch (all steps run); honored by atomic (failure on non-optional aborts + rollback)
}

export interface BatchStepResult {
  command: string;
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface BatchResult {
  ok: boolean;
  steps: BatchStepResult[];
  acc: Record<string, unknown>;
}

export async function batch(engine: Engine, steps: BatchStep[]): Promise<BatchResult> {
  const acc: Record<string, unknown> = {};
  const results: BatchStepResult[] = [];
  for (const step of steps) {
    const res = await engine.execute(step.command, step.params);
    if (res.ok) {
      if (step.assign) acc[step.assign] = res.data;
      results.push({ command: step.command, ok: true, data: res.data });
    } else {
      results.push({
        command: step.command,
        ok: false,
        error: { code: res.error.code, message: res.error.message },
      });
    }
  }
  return { ok: results.every((r) => r.ok), steps: results, acc };
}

export async function batchAtomic(engine: Engine, steps: BatchStep[]): Promise<BatchResult> {
  const snapshot = engine.store.snapshot();
  const acc: Record<string, unknown> = {};
  const results: BatchStepResult[] = [];
  let failed = false;
  for (const step of steps) {
    if (failed) break;
    const res = await engine.execute(step.command, step.params);
    if (res.ok) {
      if (step.assign) acc[step.assign] = res.data;
      results.push({ command: step.command, ok: true, data: res.data });
    } else {
      results.push({
        command: step.command,
        ok: false,
        error: { code: res.error.code, message: res.error.message },
      });
      if (!step.optional) {
        failed = true;
        restoreSnapshot(engine, snapshot);
      }
    }
  }
  return { ok: !failed && results.every((r) => r.ok), steps: results, acc };
}

function restoreSnapshot(engine: Engine, snap: ReturnType<typeof engine.store.snapshot>) {
  // Simple naive rollback: reset internal maps by reconstructing engine.store via direct mutation.
  // Current StoreFacade doesn't expose mutation hooks; we rely on casting to reach internal maps (acceptable for internal tooling helper).
  const current = engine.store.snapshot();
  // Remove entities not in snapshot
  for (const ch of current.characters) {
    if (!snap.characters.find((s) => s.id === ch.id))
      (
        engine.store as unknown as { removeEntity: (t: 'character', id: string) => void }
      ).removeEntity('character', ch.id);
  }
  for (const it of current.items) {
    if (!snap.items.find((s) => s.id === it.id))
      (engine.store as unknown as { removeEntity: (t: 'item', id: string) => void }).removeEntity(
        'item',
        it.id
      );
  }
  for (const m of current.monsters) {
    if (!snap.monsters.find((s) => s.id === m.id))
      (
        engine.store as unknown as { removeEntity: (t: 'monster', id: string) => void }
      ).removeEntity('monster', m.id);
  }
  // Note: IDs created within atomic batch that failed remain removed. Mutations to pre-existing entities aren't reverted fully (would require deep replace API).
  // Future enhancement: introduce internal _replaceAll(snap) for precise restoration.
}
