# 4. Executing Commands

Commands expose ergonomic methods under `engine.command`.

## Positional Sugar
If a command's first schema fields are primitive/ID-like, you can pass them positionally:
```ts
await engine.command.gainExperience(charId, { amount: 500 }); // maps charId -> characterId field
```
You can always pass a single object instead:
```ts
await engine.command.gainExperience({ characterId: charId, amount: 500 });
```
If you later add a non-primitive leading param the positional form may stop applying—switch to the object form for forwards compatibility.

## Result Handling
```ts
const res = await engine.command.inspireParty(charId, { bonus: 2, message: 'Charge!' });
if (res.ok) {
  console.log(res.data.durationRounds);
} else if (res.kind === 'domain') {
  // user-level error like NO_LEADER
} else {
  // engine structural error
}
```

Functional helpers:
```ts
import { mapResult, tapResult, chain } from '@osric';
const lifted = mapResult(res, d => d.newXp);
```

## Result Shape
Each command's `res.data` is the merged object of all its rule outputs. Authors often split `Validate*`, `Load*`, and `Apply*` stages; consumers just read final fields (e.g. `newXp`).

## Accessing Effects
After a successful command:
```ts
console.log(engine.events.effects);
```
Each entry includes `{ command, effects: [{ type, target, payload? }] }`.

## Batching Commands
For multi-step flows (e.g. create a character then immediately grant XP) use built-in batching helpers for clarity and (with `batchAtomic`) all-or-nothing semantics:
```ts
import { batch, batchAtomic } from '@osric';

// Non-atomic: executes in order; later commands still run if an earlier one fails.
const res = await batch(engine, [
  ['createCharacter', { race: character.human, class: character.fighter, name: 'Ryn' }],
  ['gainExperience', (r) => ({ characterId: (r[0]!.data as any).characterId, amount: 200 })],
]);

// Atomic: aborts on first failure; no side effects committed if earlier command fails.
const atomicRes = await batchAtomic(engine, [
  ['createCharacter', { race: character.human, class: character.fighter, name: 'Ada' }],
  ['gainExperience', (r) => ({ characterId: (r[0]!.data as any).characterId, amount: 500 })],
]);
```
Inside a batch step you can supply either a params object or a function that derives params from previous step results.

Next: Error Handling Patterns (5).
