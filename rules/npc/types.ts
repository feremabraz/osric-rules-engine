import type { Character, Monster } from '@rules/types';

// NPC attitude defines how an NPC feels toward the player
export const NPCAttitudes = [
  'Hostile', // Attacks on sight or sabotages
  'Unfriendly', // Distrusts and might be defensive
  'Neutral', // No strong feelings either way
  'Friendly', // Willing to help within reason
  'Helpful', // Goes out of their way to assist
] as const;

export type NPCAttitude = (typeof NPCAttitudes)[number];

// For storing NPC attitudes toward the player or other NPCs
export interface NPCAttitudeRecord {
  npcId: string;
  targetId: string; // Player character ID or another NPC's ID
  attitude: NPCAttitude;
  notes?: string; // Optional record of why the NPC feels this way
  lastInteractionTime?: number; // Game time of last interaction
}

// Charisma modifiers for reaction rolls based on the OSRIC system
export interface ReactionModifier {
  value: number; // Percentage points to add/subtract from reaction roll
  source: string; // e.g., 'Charisma', 'Magic', 'Previous Interaction'
}

// Result of a reaction roll
export interface ReactionRollResult {
  roll: number; // Raw d% (1-100) roll
  modifiers: ReactionModifier[];
  finalRoll: number; // After applying modifiers
  attitude: NPCAttitude;
  description: string;
}

// Input parameters for a reaction roll
export interface ReactionRollParams {
  npc: Character | Monster;
  player: Character;
  modifiers?: ReactionModifier[];
  context?: string; // Optional context for the interaction (e.g., "Negotiation", "First Meeting")
}

// Morale check result
export interface MoraleCheckResult {
  roll: number; // Raw d% (1-100) roll
  baseValue: number; // Base morale value for the monster/NPC
  modifiers: ReactionModifier[]; // Same structure as reaction modifiers
  finalValue: number; // After applying modifiers
  passed: boolean; // Whether the check was passed
  outcome: MoraleOutcome;
  description: string;
}

// Possible outcomes from a failed morale check
export const MoraleOutcomes = [
  'StandGround', // Passed the check, will continue fighting
  'FightingWithdrawal', // Failed by up to 25%
  'Flee', // Failed by 26-50%
  'Surrender', // Failed by 51%+
] as const;

export type MoraleOutcome = (typeof MoraleOutcomes)[number];

// Input parameters for a morale check
export interface MoraleCheckParams {
  character: Character | Monster;
  hitDiceOrLevel?: number; // Used for base morale if not specified on monster
  modifiers?: ReactionModifier[];
  allies?: (Character | Monster)[]; // For group morale calculations
  enemies?: (Character | Monster)[]; // For assessing threat
  context?: string; // E.g., "Leader killed", "Half the group lost"
}
