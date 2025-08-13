// Shared types for mounted combat rules. Individual rules moved to dedicated files for compliance.
import type { Character as CharacterData } from '@osric/types/character';

export enum AerialAgilityLevel {
  Drifting = 1,
  Poor = 2,
  Average = 3,
  Good = 4,
  Excellent = 5,
  Perfect = 6,
}

export interface Mount {
  id: string;
  name: string;
  type: string;
  movementRate: number;
  armorClass: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  size: 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  flying: boolean;
  flyingAgility: AerialAgilityLevel | null;
  encumbrance: {
    current: number;
    max: number;
  };
  isEncumbered: boolean;
  mountedBy: string | null;
}

// Rule classes moved to:
// - MountedChargeRules.ts
// - MountedCombatCoreRules.ts (MountedCombatRules)
// - DismountRules.ts
// - MountedCombatEligibilityRules.ts
