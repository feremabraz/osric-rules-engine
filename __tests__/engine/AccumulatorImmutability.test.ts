import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

// Extended immutability & integrity coverage (Roadmap Step 8)

beforeEach(() => {
  resetRegisteredCommands();
});

describe('Accumulator / delta immutability (extended)', () => {
  it('leaves draft field mutable while freezing other keys', async () => {
    class ProvideDraftAndFrozen extends Rule<{
      draft: { canMutate: number };
      frozen: { value: number };
    }> {
      static ruleName = 'ProvideDraftAndFrozen';
      static output = z.object({
        draft: z.object({ canMutate: z.number() }),
        frozen: z.object({ value: z.number() }),
      });
      apply() {
        return { draft: { canMutate: 1 }, frozen: { value: 2 } };
      }
    }
    const Cmd = defineCommand({
      key: 'DraftVsFrozen',
      params: z.object({}),
      rules: [ProvideDraftAndFrozen],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('DraftVsFrozen', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { draft: { canMutate: number }; frozen: { value: number } };
    expect(Object.isFrozen(data.draft)).toBe(false); // draft stays mutable
    expect(Object.isFrozen(data.frozen)).toBe(true);
    // Mutate draft
    data.draft.canMutate = 99;
    expect(data.draft.canMutate).toBe(99);
    // Attempt to mutate frozen
    try {
      (data.frozen as { value: number }).value = 123;
    } catch {
      /* frozen throws in strict */
    }
    expect(data.frozen.value).toBe(2);
  });

  it('prevents later rules from mutating previously frozen accumulator entries', async () => {
    class FirstRule extends Rule<{ first: { nested: number } }> {
      static ruleName = 'FirstRule';
      static output = z.object({ first: z.object({ nested: z.number() }) });
      apply() {
        return { first: { nested: 1 } };
      }
    }
    class SecondRule extends Rule<Record<string, never>> {
      static ruleName = 'SecondRule';
      // Explicit empty output schema to satisfy RuleClass requirement
      static output = z.object({});
      apply(ctx: unknown) {
        const c = ctx as { acc: { first: { nested: number } } };
        // Attempt mutation of frozen object from prior rule
        try {
          c.acc.first.nested = 999;
        } catch {
          /* ignore */
        }
        return {};
      }
    }
    const Cmd = defineCommand({
      key: 'CrossRuleFreeze',
      params: z.object({}),
      rules: [FirstRule, SecondRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('CrossRuleFreeze', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const first = (res.data as { first: { nested: number } }).first;
    expect(first.nested).toBe(1);
  });

  it('handles cyclic objects without infinite recursion and freezes the plain objects it visits', async () => {
    class CycleRule extends Rule<{ cycle: { self?: unknown } }> {
      static ruleName = 'CycleRule';
      static output = z.object({ cycle: z.object({ self: z.any().optional() }) });
      apply() {
        const obj: { self?: unknown } = {};
        obj.self = obj; // cycle
        return { cycle: obj };
      }
    }
    const Cmd = defineCommand({ key: 'CycleFreeze', params: z.object({}), rules: [CycleRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('CycleFreeze', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const cycle = (res.data as { cycle: { self: unknown } }).cycle;
    expect(Object.isFrozen(cycle)).toBe(true);
    expect((cycle as { self: unknown }).self).toBe(cycle); // reference preserved
  });

  it('freezes shared referenced objects once (identity preserved across keys)', async () => {
    class SharedRule extends Rule<{ a: { v: number }; b: { v: number } }> {
      static ruleName = 'SharedRule';
      static output = z.object({
        a: z.object({ v: z.number() }),
        b: z.object({ v: z.number() }),
      });
      apply() {
        const shared = { v: 5 };
        return { a: shared, b: shared };
      }
    }
    const Cmd = defineCommand({ key: 'SharedFreeze', params: z.object({}), rules: [SharedRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('SharedFreeze', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { a: { v: number }; b: { v: number } };
    expect(data.a).toBe(data.b); // identity preserved
    expect(Object.isFrozen(data.a)).toBe(true);
    try {
      (data.a as { v: number }).v = 100;
    } catch {
      /* ignore */
    }
    expect(data.a.v).toBe(5);
    expect(data.b.v).toBe(5);
  });

  it('deep freezes nested arrays-of-arrays-of-objects', async () => {
    class NestedArraysRule extends Rule<{ matrix: { cells: { id: number }[][] } }> {
      static ruleName = 'NestedArraysRule';
      static output = z.object({
        matrix: z.object({ cells: z.array(z.array(z.object({ id: z.number() }))) }),
      });
      apply() {
        return { matrix: { cells: [[{ id: 1 }, { id: 2 }], [{ id: 3 }]] } };
      }
    }
    const Cmd = defineCommand({
      key: 'NestedArrays',
      params: z.object({}),
      rules: [NestedArraysRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('NestedArrays', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { matrix: { cells: { id: number }[][] } };
    expect(Object.isFrozen(data.matrix)).toBe(true);
    expect(Object.isFrozen(data.matrix.cells)).toBe(true);
    expect(Object.isFrozen(data.matrix.cells[0])).toBe(true);
    expect(Object.isFrozen(data.matrix.cells[0][0])).toBe(true);
    try {
      (data.matrix.cells[0][0] as { id: number }).id = 999;
    } catch {
      /* ignore */
    }
    expect(data.matrix.cells[0][0].id).toBe(1);
  });

  it('keeps nested objects inside draft mutable while freezing sibling accumulator keys', async () => {
    class DraftNestedRule extends Rule<{
      draft: { nested: { a: number } };
      config: { nested: { b: number } };
    }> {
      static ruleName = 'DraftNestedRule';
      static output = z.object({
        draft: z.object({ nested: z.object({ a: z.number() }) }),
        config: z.object({ nested: z.object({ b: z.number() }) }),
      });
      apply() {
        return { draft: { nested: { a: 1 } }, config: { nested: { b: 2 } } };
      }
    }
    const Cmd = defineCommand({
      key: 'DraftNested',
      params: z.object({}),
      rules: [DraftNestedRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('DraftNested', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as {
      draft: { nested: { a: number } };
      config: { nested: { b: number } };
    };
    // Draft and its nested object are mutable
    expect(Object.isFrozen(data.draft)).toBe(false);
    expect(Object.isFrozen(data.draft.nested)).toBe(false);
    data.draft.nested.a = 10;
    expect(data.draft.nested.a).toBe(10);
    // Sibling key objects are frozen deep
    expect(Object.isFrozen(data.config)).toBe(true);
    expect(Object.isFrozen(data.config.nested)).toBe(true);
    try {
      (data.config.nested as { b: number }).b = 99;
    } catch {
      /* ignore */
    }
    expect(data.config.nested.b).toBe(2);
  });

  it('preserves function properties (callable) while freezing owning object', async () => {
    class FunctionPropRule extends Rule<{ handler: { fn: () => number } }> {
      static ruleName = 'FunctionPropRule';
      static output = z.object({ handler: z.object({ fn: z.any() }) });
      apply() {
        return { handler: { fn: () => 42 } };
      }
    }
    const Cmd = defineCommand({
      key: 'FunctionProp',
      params: z.object({}),
      rules: [FunctionPropRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('FunctionProp', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { handler: { fn: () => number } };
    expect(Object.isFrozen(data.handler)).toBe(true); // container frozen
    expect(typeof data.handler.fn).toBe('function');
    expect(data.handler.fn()).toBe(42);
    // Function object itself should not necessarily be frozen
    expect(Object.isFrozen(data.handler.fn)).toBe(false);
    // Attempt to replace the function should fail silently or throw (object frozen)
    try {
      (data.handler as { fn: () => number }).fn = () => 100;
    } catch {
      /* ignore */
    }
    expect(data.handler.fn()).toBe(42);
  });

  it('deep freezes mixed arrays containing objects and primitives', async () => {
    class MixedArrayRule extends Rule<{ mixed: (number | { v: number } | string)[] }> {
      static ruleName = 'MixedArrayRule';
      static output = z.object({
        mixed: z.array(z.union([z.number(), z.object({ v: z.number() }), z.string()])),
      });
      apply() {
        return { mixed: [1, { v: 2 }, 'three', { v: 4 }] };
      }
    }
    const Cmd = defineCommand({ key: 'MixedArray', params: z.object({}), rules: [MixedArrayRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('MixedArray', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { mixed: (number | { v: number } | string)[] };
    expect(Object.isFrozen(data.mixed)).toBe(true);
    for (const el of data.mixed) if (typeof el === 'object') expect(Object.isFrozen(el)).toBe(true);
  });

  it('freezes Date objects without breaking their methods', async () => {
    class DateRule extends Rule<{ stamp: Date }> {
      static ruleName = 'DateRule';
      static output = z.object({ stamp: z.any() });
      apply() {
        return { stamp: new Date(1700000000000) };
      }
    }
    const Cmd = defineCommand({ key: 'DateFreeze', params: z.object({}), rules: [DateRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('DateFreeze', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { stamp: Date };
    expect(Object.isFrozen(data.stamp)).toBe(true);
    expect(data.stamp.getTime()).toBe(1700000000000);
  });

  it('freezes large nested object graphs efficiently (sample size)', async () => {
    class LargeRule extends Rule<{ big: { nodes: { id: number; child?: { id: number } }[] } }> {
      static ruleName = 'LargeRule';
      static output = z.object({
        big: z.object({
          nodes: z.array(
            z.object({ id: z.number(), child: z.object({ id: z.number() }).optional() })
          ),
        }),
      });
      apply() {
        const nodes: { id: number; child?: { id: number } }[] = [];
        for (let i = 0; i < 50; i++) nodes.push({ id: i, child: { id: i * 100 } });
        return { big: { nodes } };
      }
    }
    const Cmd = defineCommand({ key: 'LargeFreeze', params: z.object({}), rules: [LargeRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const start = Date.now();
    const res = await engine.execute('LargeFreeze', {});
    const dur = Date.now() - start;
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { big: { nodes: { id: number; child?: { id: number } }[] } };
    expect(Object.isFrozen(data.big)).toBe(true);
    expect(Object.isFrozen(data.big.nodes)).toBe(true);
    for (const n of data.big.nodes) {
      expect(Object.isFrozen(n)).toBe(true);
      if (n.child) expect(Object.isFrozen(n.child)).toBe(true);
    }
    // Soft performance guard (should be fast; allow generous threshold to avoid flake)
    expect(dur).toBeLessThan(200);
  });

  it('prevents adding new properties to frozen accumulator objects', async () => {
    class SimpleRule extends Rule<{ obj: { a: number } }> {
      static ruleName = 'SimpleRule';
      static output = z.object({ obj: z.object({ a: z.number() }) });
      apply() {
        return { obj: { a: 1 } };
      }
    }
    const Cmd = defineCommand({ key: 'NoExtend', params: z.object({}), rules: [SimpleRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('NoExtend', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const obj = (res.data as { obj: { a: number; b?: number } }).obj;
    try {
      (obj as { b?: number }).b = 2;
    } catch {
      /* ignore */
    }
    expect((obj as { b?: number }).b).toBeUndefined();
  });

  it('keeps functions inside frozen arrays callable', async () => {
    class FunctionArrayRule extends Rule<{ list: (number | (() => number))[] }> {
      static ruleName = 'FunctionArrayRule';
      static output = z.object({ list: z.array(z.any()) });
      apply() {
        return { list: [1, () => 7, 3] };
      }
    }
    const Cmd = defineCommand({
      key: 'FuncArray',
      params: z.object({}),
      rules: [FunctionArrayRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('FuncArray', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { list: (number | (() => number))[] };
    expect(Object.isFrozen(data.list)).toBe(true);
    const fn = data.list[1];
    expect(typeof fn).toBe('function');
    if (typeof fn === 'function') expect(fn()).toBe(7);
  });
});
