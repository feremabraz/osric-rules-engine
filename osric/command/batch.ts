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
  const acc: Record<string, unknown> = {};
  const results: BatchStepResult[] = [];
  let aborted = false;
  engine.beginTransaction();
  try {
    for (const step of steps) {
      if (aborted) break;
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
          aborted = true;
          engine.rollbackTransaction();
        }
      }
    }
    if (!aborted) engine.commitTransaction();
  } catch (e) {
    engine.rollbackTransaction();
    throw e;
  }
  const overallOk = !aborted && results.every((r, idx) => r.ok || steps[idx].optional === true);
  return { ok: overallOk, steps: results, acc };
}
