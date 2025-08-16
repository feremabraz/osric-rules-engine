// DE-02 grantXp command definition using common engine DSL
import { command, domainFail, success } from '../../engine';
import type { DomainMemoryStore } from '../memoryStore';
import { requireCharacter } from '../shared-rules/characterExist';

// Params shape for the command
export interface GrantXpParams {
  id: string;
  amount: number;
}

// Result data shape on success
export interface GrantXpResult {
  id: string;
  newXp: number;
}

command<GrantXpParams>('osric:grantXp')
  .validate((_acc, params) => {
    if (!params || typeof params.id !== 'string' || typeof params.amount !== 'number') {
      return domainFail('INVALID_PARAMS', 'id and amount required');
    }
    if (params.amount <= 0) return domainFail('INVALID_AMOUNT', 'amount must be > 0');
    return {}; // fragment no data
  })
  .load(requireCharacter<GrantXpParams, 'id'>('id', 'NOT_FOUND'))
  .mutate((_acc, params, ctx) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const ch = store.getCharacter(params.id);
    if (!ch) return domainFail('NOT_FOUND'); // defensive; load stage should prevent
    ch.xp += params.amount;
    return {}; // fragment no data
  })
  .emit((_acc, params, ctx): GrantXpResult => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const ch = store.getCharacter(params.id);
    return { id: params.id, newXp: ch ? ch.xp : Number.NaN };
  });
