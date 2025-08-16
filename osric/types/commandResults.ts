// Explicit result shapes (temporarily replacing brittle static inference while rule output
// schema typing is being refined). Keep keys minimal & aligned with tests.
export interface CommandResultShape {
  createCharacter: {
    characterId: string;
    name: string;
    race: string;
    class: string;
    level: number;
    hp: number;
    hpMax: number;
    xp: number;
    faction?: string;
  };
  gainExperience: {
    characterId: string;
    newXp: number;
    nextLevelThreshold: number;
    levelUpEligible?: boolean;
    levelsGained?: number;
    newLevel?: number;
  };
  inspireParty: {
    affected: string[];
    durationRounds?: number;
  };
  [commandKey: string]: unknown;
}

// Convenience specific result types
export type CreateCharacterResult = CommandResultShape['createCharacter'];
export type GainExperienceResult = CommandResultShape['gainExperience'];
export type InspirePartyResult = CommandResultShape['inspireParty'];
export type CommandKey = keyof CommandResultShape & string;
