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

### Forcing RNG State
```ts
const { engine, start } = testEngine({ seed: 1, rngOverride: rng => rng.setState(1234) })
  .register(InspirePartyCommand)
  .withCharacter('leader', 'human', 'fighter', { name: 'L' })
  .finalize();
await start();
```

Next: Observability (7).
