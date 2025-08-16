# 2. Command File Template

We use `defineCommand` to eliminate bespoke subclasses for most commands. You still co‑locate your `Rule` classes; the factory wires the static metadata.

## Example
```ts
import { defineCommand, Rule, type RuleCtx, characterIdSchema, getCharacter, updateCharacter, type CharacterId } from 'osric';
import { z } from 'zod';

const params = z.object({ characterId: characterIdSchema, amount: z.number().int().positive() });
type Params = z.infer<typeof params>;

// 1. Validate (no accumulator output)
class Validate extends Rule<Record<string, never>> {
  static ruleName = 'Validate';
  static output = z.object({}); // empty
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, Record<string, never>>;
    // (Optional extra param checks could go here)
    // We succeed with empty delta
    return {};
  }
}

// 2. Load (depends on Validate)
interface CharacterForGrant { id: CharacterId; xp: number }
interface LoadOut extends Record<string, unknown> { character: CharacterForGrant }
class Load extends Rule<LoadOut> {
  static ruleName = 'Load';
  static after = ['Validate'];
  static output = z.object({
    character: z.object({ id: characterIdSchema, xp: z.number().int() }),
  });
  apply(ctx: unknown): LoadOut {
    const c = ctx as RuleCtx<Params, Record<string, never>>;
    const ch = getCharacter(c.store, c.params.characterId);
    if (!ch) return c.fail('CHARACTER_NOT_FOUND', 'Character not found') as unknown as LoadOut;
    return { character: { id: ch.id, xp: ch.xp } };
  }
}

// 3. Grant XP (depends on Load)
class Grant extends Rule<{ newXp: number }> {
  static ruleName = 'Grant';
  static after = ['Load'];
  static output = z.object({ newXp: z.number().int() });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, LoadOut>;
    const updated = updateCharacter(c.store, c.acc.character.id, {
      xp: c.acc.character.xp + c.params.amount,
    });
    return { newXp: updated.xp };
  }
}

// 4. Assemble command
export const GrantXpCommand = defineCommand({
  key: 'grantXp',
  params,
  rules: [Validate, Load, Grant],
});
// In tests or internal setup you still call registerCommand; external consumers typically rely on built-in or documented registration hooks.
```

## Empty Output Rules
If a rule contributes no accumulator keys, return `{}` and use `static output = z.object({})`.

## When To Still Use a Subclass
Only if you need a custom constructor or dynamic rule assembly (rare). The `defineCommand` factory + co‑located `Rule` classes cover almost all cases.

## Simulating a Command Before Commit
```ts
// After registering & starting engine
const preview = await simulate(engine, 'grantXp', { characterId, amount: 50 });
if (preview.result.ok) console.log(preview.diff);
```

## Key Conventions Recap
1. Always use branded ID schemas (`characterIdSchema`, `battleIdSchema`, etc.) in params.
2. Keep `apply(ctx: unknown)` for structural compatibility; inside cast to `RuleCtx<Params, Acc>`.
3. Return plain objects; engine merges them (no `ok()` helper needed).
4. Each rule declares a precise `output` schema; use `z.object({})` for empty.
5. Use domain `ctx.fail(code, message)` for business failures; throw for programmer bugs.
6. Use `simulate` for speculative inspection (diff, diagnostics) before affecting persistent state.
7. Emit effects only in terminal rules after validation passes.

Next: Rule Design Guidelines (3).
