// Compatibility re-exports for legacy imports from '@osric/core/Types'.
// Canonical definitions now live in '@osric/types/*'.
export type { Character, CharacterClass, AbilityScores, ThiefSkills } from '@osric/types/character';
export type { Monster, MonsterFrequency, CreatureSize } from '@osric/types/monster';
export type { Item } from '@osric/types/item';
export type { Spell } from '@osric/types/spell';
export type { CharacterId, ItemId, MonsterId, SpellId } from '@osric/types/shared';
export type {
  Brand,
  SavingThrowType,
  StatusEffect,
  AttackRoll,
  Damage,
  GameTime,
  Position,
  Movement,
} from '@osric/types/shared';
