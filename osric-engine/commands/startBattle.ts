// DE-04 startBattle command - initializes a battle state with participants
import { command, domainFail } from '../../engine';
import type { BattleParticipant, BattleState } from '../domain/entities/battle';
import type { DomainMemoryStore } from '../memoryStore';
import { requireCharacter } from '../shared-rules/characterExist';

export interface StartBattleParams {
  id: string;
  participantIds: string[];
}
export interface StartBattleResult {
  id: string;
  round: number;
  participants: { id: string; initiative: number | null }[];
}

command<StartBattleParams>('osric:startBattle')
  .validate((_acc, p) => {
    if (!p || typeof p.id !== 'string' || !Array.isArray(p.participantIds))
      return domainFail('INVALID_PARAMS');
    if (!p.id) return domainFail('INVALID_ID');
    if (p.participantIds.length === 0) return domainFail('NO_PARTICIPANTS');
    return;
  })
  // Use a bespoke load rule to verify each participant. We reuse requireCharacter per id.
  .load((_acc, p, ctx) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    for (const cid of p.participantIds) {
      if (typeof cid !== 'string' || !store.getCharacter(cid)) {
        return domainFail('CHAR_NOT_FOUND');
      }
    }
    return {};
  })
  .mutate((_acc, p, ctx) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    if (store.getBattle(p.id)) return domainFail('DUPLICATE_BATTLE');
    const participants: BattleParticipant[] = p.participantIds.map((id) => ({
      id,
      initiative: null,
    }));
    const battle: BattleState = { id: p.id, round: 1, participants, status: 'pending' };
    store.addBattle(battle);
    return {};
  })
  .emit((_acc, p, ctx): StartBattleResult => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const b = store.getBattle(p.id);
    if (!b) return { id: p.id, round: 0, participants: [] }; // defensive
    return {
      id: b.id,
      round: b.round,
      participants: b.participants.map((pt) => ({ id: pt.id, initiative: pt.initiative })),
    };
  });
