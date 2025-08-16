# 02. OSRIC Domain Engine Plan

Defines how the OSRIC layer composes the common engine.

## Responsibilities
- Provide domain entities & store implementation.
- Register commands (each file self-contained pipeline + rules).
- Post-process committed effects: mirror into battle logs.
- Offer batch & simulate forwarding wrappers.

osric-engine/
## Implemented File Layout
```
osric-engine/
  engine.ts
  memoryStore.ts
  domain/
    entities/
      battle.ts
  commands/
    grantXp.ts
    createCharacter.ts
    inspireParty.ts
    startBattle.ts
    attackRoll.ts
  shared-rules/
    characterExist.ts
  effects/
    mirrorBattleEffects.ts
  scenarios/
    determinism.ts
  index.ts
```

## engine.ts (Wrapper Sketch)
```ts
import { createEngine as createCommonEngine } from '../engine';
import { memoryStore } from './domain/store/memoryStore';
import * as commands from './commands';
import { mirrorBattleEffectsIfAny } from './domain/battle/battleHelpers';

export function createOsricEngine(config?: { seed?: number }) {
  const store = memoryStore();
  const ce = createCommonEngine({ seed: config?.seed, store });
  // Register commands
  for (const c of Object.values(commands)) ce.register(c);
  return {
    execute: async (key: string, params: unknown) => {
      const res = await ce.execute(key, params);
      if (res.ok && res.effects?.length) mirrorBattleEffectsIfAny(res.effects, store);
      return res;
    },
    batch: async (list, opts) => {
      const out = await ce.batch(list, opts);
      if (out.ok && out.effects?.length) mirrorBattleEffectsIfAny(out.effects, store);
      return out;
    },
    simulate: (key: string, params: unknown) => ce.simulate(key, params),
    store,
  };
}
```
(Exact API may adjust when CE specifics finalize.)

## Command Authoring Pattern
Example `grantXp.ts`:
```ts
import { z } from 'zod';
import { command } from '../../engine'; // re-exported DSL
import { characterIdSchema } from '../domain/ids';

const params = z.object({ characterId: characterIdSchema, amount: z.number().int().positive() });
export const grantXp = command('grantXp', params)
  .validate(({ params, store, fail }) => {
    if (!store.getCharacter(params.characterId)) return fail('CHARACTER_NOT_FOUND');
  })
  .load(({ params, store }) => ({ character: store.getCharacter(params.characterId) }))
  .mutate(({ acc, params, store }) => ({
    newXp: store.updateCharacter(acc.character.id, { xp: acc.character.xp + params.amount }).xp
  }))
  .emit(({ acc, effects }) => { effects.add('xpGranted', acc.character.id, { amount: acc.newXp }); });
```

## Battle Effects Mirroring
Goal: maintain a per-battle round-scoped effects log.
Algorithm:
1. Snapshot active battles with participant IDs.
2. For each effect (type,target,payload JSON) if target participates and tuple `(round,type,target,payload)` not already logged, append.
3. Guarantee idempotency within same command or batch.

Stored structure (simplified):
```ts
battle.effectsLog: { round: number; type: string; target: string; payload?: unknown }[]
```

## Shared Rules Status
Current shared rule: `characterExist` (used by grantXp, inspireParty, attackRoll). Promotion rule: only elevate when reused verbatim by ≥2 commands and stable.

## Testing Focus (Domain)
- Command success/failure scenarios.
- Battle flow sequences (startBattle -> attackRoll -> etc.).
- Effects mirror uniqueness per round.
- XP gain accumulation & edge cases.
- Shared rule correctness vs direct duplicate inline logic.

## Determinism Guarantee
Verified via `scenarios/determinism.ts` (DE-08) test: identical JSON for same seed.

## Migration Sequencing
1. Implement store & minimal entities.
2. Port simplest command (`grantXp`).
3. Implement battle helpers + startBattle + attackRoll.
4. Port remaining commands; consolidate any extracted shared rule candidates.
5. Add tests & finalize wrapper.

## Future Extensions (Document Only)
- Derived projections (e.g., precomputed initiative order caches) built as pure shared rules.
- Export graph snapshots per command for docs generation.
