// DE-05 attackRoll command – demonstrates RNG usage (d20 roll)
import { command, domainFail } from '../../engine';
import type { DomainMemoryStore } from '../memoryStore';
import { requireCharacter } from '../shared-rules/characterExist';

export interface AttackRollParams {
  attackerId: string;
  targetId: string;
}
export interface AttackRollResult {
  attackerId: string;
  targetId: string;
  roll: number;
}

command<AttackRollParams>('osric:attackRoll')
  .validate((_acc, p) => {
    if (!p || typeof p.attackerId !== 'string' || typeof p.targetId !== 'string')
      return domainFail('INVALID_PARAMS');
    return {};
  })
  .load(requireCharacter<AttackRollParams, 'attackerId'>('attackerId'))
  .load(requireCharacter<AttackRollParams, 'targetId'>('targetId'))
  .calc((_acc, p, ctx) => {
    // Use RNG to produce d20 roll (1..20)
    const rng = (ctx as unknown as { rng: { int: (min: number, max: number) => number } }).rng;
    const roll = rng.int(1, 20);
    return { attackerId: p.attackerId, targetId: p.targetId, roll };
  })
  .emit(() => {
    /* no-op emit to finalize descriptor without adding duplicate keys */
  });
