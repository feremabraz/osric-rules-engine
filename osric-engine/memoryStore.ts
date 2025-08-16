// DE-01 Domain Memory Store wrapping engine MemoryStore but with typed domain state
import { MemoryStore as CoreMemoryStore } from '../engine/core/types';
import type { BattleState } from './domain/entities/battle';

// Minimal domain entities for DE-01
export interface Character {
  id: string;
  name: string;
  xp: number;
}

export interface DomainState {
  characters: Character[];
  battles: BattleState[];
}

// DomainMemoryStore adds convenience entity operations used by early domain commands
export class DomainMemoryStore extends CoreMemoryStore<DomainState> {
  constructor(initial?: Partial<DomainState>) {
    super({
      characters: [],
      battles: [],
      ...initial,
    } as DomainState);
  }

  getCharacter(id: string): Character | undefined {
    return this.getState().characters.find((c) => c.id === id);
  }

  addCharacter(c: Character): void {
    const arr = this.getState().characters;
    if (arr.some((e) => e.id === c.id)) throw new Error('Character id already exists');
    arr.push(c);
  }

  updateCharacter(id: string, patch: Partial<Omit<Character, 'id'>>): void {
    const c = this.getCharacter(id);
    if (!c) throw new Error('Character not found');
    if (patch.name !== undefined) c.name = patch.name;
    if (patch.xp !== undefined) c.xp = patch.xp;
  }

  // Battle helpers
  addBattle(b: BattleState): void {
    const arr = this.getState().battles;
    if (arr.some((e) => e.id === b.id)) throw new Error('Battle id exists');
    arr.push(b);
  }
  getBattle(id: string): BattleState | undefined {
    return this.getState().battles.find((b) => b.id === id);
  }
}
