// DE-03 createCharacter command
import { command, domainFail } from '../../engine';
import type { DomainMemoryStore } from '../memoryStore';
import type { Character } from '../memoryStore';

export interface CreateCharacterParams {
  id: string;
  name: string;
}
export interface CreateCharacterResult {
  id: string;
  name: string;
  xp: number;
}

command<CreateCharacterParams>('osric:createCharacter')
  .validate((_acc, p) => {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.id || !p.name) {
      return domainFail('INVALID_PARAMS');
    }
    return {};
  })
  .mutate((_acc, p, ctx) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    if (store.getCharacter(p.id)) return domainFail('DUPLICATE_ID');
    store.addCharacter({ id: p.id, name: p.name, xp: 0 });
    return {};
  })
  .emit((_acc, p, ctx): CreateCharacterResult => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const ch = store.getCharacter(p.id) as Character | undefined;
    return { id: ch?.id ?? p.id, name: ch?.name ?? p.name, xp: ch?.xp ?? 0 };
  });
