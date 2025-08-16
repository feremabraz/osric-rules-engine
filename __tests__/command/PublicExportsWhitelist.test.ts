import { describe, expect, it } from 'vitest';
import * as pub from '../../osric';

// Curated whitelist of public export keys (Step 6)
const allowed = new Set([
  'Engine',
  'Command',
  'defineCommand',
  'batch',
  'batchAtomic',
  'getCommandDigests',
  'explainRuleGraph',
  'simulate',
  // Types / schemas present at runtime
  'EngineConfigSchema',
  'isOk',
  'isFail',
  'assertOk',
  'unwrap',
  // Domain identity
  'createCharacterId',
  'createMonsterId',
  'createItemId',
  'createBattleId',
  'characterIdSchema',
  'monsterIdSchema',
  'itemIdSchema',
  'battleIdSchema',
  'idKind',
  'ensureCharacterId',
  // Domain helpers retained
  'getCombatSnapshot',
  'getBattleSnapshot',
  'getEffects',
  'effectStats',
  'getBattle',
  'activeCombatant',
  'listBattleOrder',
  'getCharacter',
  'requireCharacter',
  'updateCharacter',
  'listCharacters',
  'queryFaction',
  'applyAttackAndDamage',
]);

describe('Public export whitelist', () => {
  it('contains only allowed keys', () => {
    const exported = Object.keys(pub).sort();
    const unexpected = exported.filter((k) => !allowed.has(k));
    expect(unexpected).toEqual([]);
  });
});
