# 2. Command File Template

A command module defines a single `Command` subclass plus its co-located `Rule` classes and ends with a `registerCommand` call.

## Minimal Example
```ts
import { Command, Rule, registerCommand } from '@osric';
import { z } from 'zod';

const params = z.object({ characterId: z.string(), amount: z.number().int().positive() });

class Validate extends Rule<{ character: Record<string, unknown> }> {
  static ruleName = 'Validate';
  static output = z.object({ character: z.record(z.unknown()) });
  apply(ctx: any) {
    const ch = ctx.store.getEntity('character', ctx.params.characterId);
    if (!ch) return ctx.fail('CHARACTER_NOT_FOUND', 'Missing');
    return { character: ch };
  }
}

class Apply extends Rule<{ newXp: number }> {
  static ruleName = 'Apply';
  static after = ['Validate'];
  static output = z.object({ newXp: z.number().int() });
  apply(ctx: any) {
    const updated = ctx.store.updateEntity('character', ctx.acc.character.id, { xp: ctx.acc.character.xp + ctx.params.amount });
    return { newXp: updated.xp };
  }
}

export class GrantXpCommand extends Command {
  static key = 'grantXp';
  static params = params;
  static rules = [Validate, Apply];
}
registerCommand(GrantXpCommand);
```

Next: Rule Design Guidelines (3).
