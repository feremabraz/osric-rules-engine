# 6. Deterministic Testing

Use the public test harness utilities for reproducible tests.

```ts
import { testEngine } from '@osric';

const { engine, start } = testEngine({ seed: 7 })
  .register(GainExperienceCommand)
  .withCharacter('hero', 'human', 'fighter', { name: 'Hero' })
  .finalize();

const { ids } = await start();
const res = await engine.command.gainExperience(ids.hero, { amount: 120 });
expect(res.ok && res.data.newXp).toBeDefined();
```

### RNG Advancement Model
RNG advances once per command baseline plus each explicit roll inside rules. Adding a new non-RNG rule does not shift existing outcome sequences.

### Temporary Seeding
```ts
import { withTempSeed } from '@osric';
await withTempSeed(engine, 999, async () => {
  await engine.command.savingThrow(charId, { type: 'death' });
});
```

### Dice Helpers
```ts
import { rollDie, rollDice } from '@osric';
const d8 = rollDie(engine.rng!, 8);
const total = rollDice(engine.rng!, '2d6+1');
```

### Test Shortcuts
`fastCharacter(engine, { name })` creates and persists a character; `snapshotWorld(engine)` builds a slim world digest; `normalizeSnapshot(obj)` strips unstable ordering.

### Forcing RNG State
```ts
const { engine, start } = testEngine({ seed: 1, rngOverride: rng => rng.setState(1234) })
  .register(InspirePartyCommand)
  .withCharacter('leader', 'human', 'fighter', { name: 'L' })
  .finalize();
await start();
```

Next: Observability (7).
