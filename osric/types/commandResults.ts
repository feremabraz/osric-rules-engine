// Phase 1 (Step 4/5): Typed command result aggregation surface
// The base interface is intentionally empty; each command file augments it via
//   declare global { interface CommandResultShape { myCommand: { ... } } }
// allowing incremental, localized typing without a central manifest.
// Engine then uses keyof CommandResultShape for typed execute()/proxy methods.
// Future phases will refine value types (currently mostly unknown) once rule
// output schemas are introduced.

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
    durationRounds?: number; // may be present depending on rule ordering / design evolution
  };
  [commandKey: string]: unknown; // extensibility hook
}

// Convenience specific result types (library design clarity section):
export type CreateCharacterResult = CommandResultShape['createCharacter'];
export type GainExperienceResult = CommandResultShape['gainExperience'];
export type InspirePartyResult = CommandResultShape['inspireParty'];

export type CommandKey = keyof CommandResultShape & string;
