// DE-03 inspireParty command (simplified) — applies a moraleBonus to all characters
import { command, domainFail } from '../../engine';
import type { DomainMemoryStore } from '../memoryStore';
import type { Character } from '../memoryStore';
import { requireCharacter } from '../shared-rules/characterExist';

export interface InspirePartyParams {
  leaderId: string;
  bonus: number;
  message?: string;
}
export interface InspirePartyResult {
  affected: number;
  leaderId: string;
  bonus: number;
}

command<InspirePartyParams>('osric:inspireParty')
  .validate((_acc, p) => {
    if (!p || typeof p.leaderId !== 'string' || typeof p.bonus !== 'number')
      return domainFail('INVALID_PARAMS');
    if (p.bonus <= 0) return domainFail('INVALID_BONUS');
    return; // no fragment
  })
  .load(requireCharacter<InspirePartyParams, 'leaderId'>('leaderId'))
  .mutate((_acc, p, ctx) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    // leader existence guaranteed by load stage; mutate all characters
    const chars = store.getState().characters as Character[];
    for (const c of chars) {
      (c as unknown as { moraleBonus?: number }).moraleBonus =
        (c as unknown as { moraleBonus?: number }).moraleBonus ?? 0;
      (c as unknown as { moraleBonus: number }).moraleBonus += p.bonus;
    }
    return; // no fragment; emit will provide final result
  })
  .emit((_acc, p, ctx): InspirePartyResult => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const count = store.getState().characters.length;
    return { affected: count, leaderId: p.leaderId, bonus: p.bonus };
  });
