import type { Character, Monster } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type {
  NPCAttitude,
  ReactionModifier,
  ReactionRollParams,
  ReactionRollResult,
} from './types';

/**
 * OSRIC-based reaction roll table
 * Base is a d% (1-100) roll with modifiers from charisma and other factors
 */
export const REACTION_ROLL_TABLE: Record<
  string,
  { min: number; max: number; attitude: NPCAttitude; description: string }
> = {
  hostileAttack: {
    min: 1,
    max: 20,
    attitude: 'Hostile',
    description: 'Immediate hostility, likely to attack if able',
  },
  hostileFlee: {
    min: 21,
    max: 30,
    attitude: 'Hostile',
    description: 'Extremely unfriendly, may flee or call for help',
  },
  unfriendlyCautious: {
    min: 31,
    max: 45,
    attitude: 'Unfriendly',
    description: 'Suspicious and guarded, but not immediately hostile',
  },
  unfriendlyWary: {
    min: 46,
    max: 60,
    attitude: 'Unfriendly',
    description: 'Distrustful but willing to listen briefly',
  },
  neutralDisinterested: {
    min: 61,
    max: 70,
    attitude: 'Neutral',
    description: 'Disinterested or uncertain',
  },
  neutralCurious: {
    min: 71,
    max: 80,
    attitude: 'Neutral',
    description: 'Mildly curious or cautiously open',
  },
  friendlyPositive: {
    min: 81,
    max: 90,
    attitude: 'Friendly',
    description: 'Positively disposed and willing to help within reason',
  },
  friendlySupportive: {
    min: 91,
    max: 95,
    attitude: 'Friendly',
    description: 'Quite friendly and supportive',
  },
  helpfulGenerous: {
    min: 96,
    max: 100,
    attitude: 'Helpful',
    description: 'Very helpful, generous, potentially offering aid',
  },
  helpfulLoyal: {
    min: 101,
    max: 999,
    attitude: 'Helpful',
    description: 'Enthusiastically helpful, may go out of their way to assist',
  },
};

/**
 * Get charisma reaction modifier based on character's charisma score
 */
export function getCharismaReactionModifier(character: Character): ReactionModifier {
  const charisma = character.abilities.charisma;

  // Based on OSRIC charisma reaction modifiers (exact table match)
  if (charisma <= 3) return { value: -25, source: 'Charisma' };
  if (charisma <= 4) return { value: -20, source: 'Charisma' };
  if (charisma <= 5) return { value: -15, source: 'Charisma' };
  if (charisma <= 6) return { value: -10, source: 'Charisma' };
  if (charisma <= 7) return { value: -5, source: 'Charisma' };
  if (charisma <= 12) return { value: 0, source: 'Charisma' };
  if (charisma === 13) return { value: 5, source: 'Charisma' };
  if (charisma === 14) return { value: 10, source: 'Charisma' };
  if (charisma === 15) return { value: 15, source: 'Charisma' };
  if (charisma === 16) return { value: 25, source: 'Charisma' };
  if (charisma === 17) return { value: 30, source: 'Charisma' };
  if (charisma === 18) return { value: 35, source: 'Charisma' };
  if (charisma === 19) return { value: 40, source: 'Charisma' };
  return { value: 40, source: 'Charisma' }; // For cases above 19
}

/**
 * Check for alignment compatibility - similar alignments provide a bonus
 */
export function getAlignmentModifier(
  player: Character,
  npc: Character | Monster
): ReactionModifier {
  const playerAlign = player.alignment;
  const npcAlign = npc.alignment;

  // Same alignment gives a bonus
  if (playerAlign === npcAlign) {
    return { value: 10, source: 'Alignment Match' };
  }

  // Same moral axis (Law/Chaos) gives a smaller bonus
  const playerLawChaos = playerAlign.split(' ')[0];
  const npcLawChaos = npcAlign.split(' ')[0];
  if (playerLawChaos === npcLawChaos) {
    return { value: 5, source: 'Alignment Similarity' };
  }

  // Same ethical axis (Good/Evil) gives a smaller bonus too
  const playerGoodEvil = playerAlign.split(' ')[1];
  const npcGoodEvil = npcAlign.split(' ')[1];
  if (playerGoodEvil && npcGoodEvil && playerGoodEvil === npcGoodEvil) {
    return { value: 5, source: 'Alignment Similarity' };
  }

  // Directly opposing alignments give a penalty
  if (
    (playerLawChaos === 'Lawful' && npcLawChaos === 'Chaotic') ||
    (playerLawChaos === 'Chaotic' && npcLawChaos === 'Lawful') ||
    (playerGoodEvil === 'Good' && npcGoodEvil === 'Evil') ||
    (playerGoodEvil === 'Evil' && npcGoodEvil === 'Good')
  ) {
    return { value: -10, source: 'Alignment Opposition' };
  }

  return { value: 0, source: 'Alignment' };
}

/**
 * Perform a reaction roll to determine an NPC's initial attitude
 */
export function performReactionRoll(params: ReactionRollParams): ReactionRollResult {
  const { npc, player, modifiers = [] } = params;

  // Start with basic charisma modifier
  const allModifiers: ReactionModifier[] = [getCharismaReactionModifier(player), ...modifiers];

  // Add alignment modifier if both entities have alignments
  if (player.alignment && npc.alignment) {
    allModifiers.push(getAlignmentModifier(player, npc));
  }

  // Add race-specific modifiers - some races may have natural affinities or prejudices
  // For example, dwarves might react poorly to elves
  if (player.race === 'Dwarf' && 'race' in npc && (npc.race === 'Elf' || npc.race === 'Half-Elf')) {
    allModifiers.push({ value: -5, source: 'Racial Tension' });
  }

  // Add class-specific modifiers - NPCs might prefer certain classes
  if ('class' in npc && npc.class === player.class) {
    allModifiers.push({ value: 5, source: 'Same Class' });
  }

  // Roll the base reaction (d100)
  const diceRoll = roll(100);

  // Calculate total modifier value
  const totalModifier = allModifiers.reduce((sum, mod) => sum + mod.value, 0);

  // Calculate final roll value capped between 1 and 999 (technically 100, but allowing over 100 for exceptional results)
  const finalRoll = Math.max(1, Math.min(999, diceRoll + totalModifier));

  // Determine the attitude based on the reaction roll table
  let result: { attitude: NPCAttitude; description: string } = {
    attitude: 'Neutral',
    description: 'Disinterested or uncertain',
  };

  // Find the appropriate table entry
  for (const entry of Object.values(REACTION_ROLL_TABLE)) {
    if (finalRoll >= entry.min && finalRoll <= entry.max) {
      result = {
        attitude: entry.attitude,
        description: entry.description,
      };
      break;
    }
  }

  return {
    roll: diceRoll,
    modifiers: allModifiers,
    finalRoll,
    attitude: result.attitude,
    description: result.description,
  };
}

/**
 * Convert numerical reaction modifier to descriptive text
 */
export function describeReactionModifiers(modifiers: ReactionModifier[]): string {
  if (modifiers.length === 0) return 'No modifiers applied.';

  return modifiers
    .map((mod) => {
      const sign = mod.value >= 0 ? '+' : '';
      return `${mod.source}: ${sign}${mod.value}%`;
    })
    .join(', ');
}

/**
 * Generate a narrative description of the reaction roll
 */
export function narrateReactionRoll(result: ReactionRollResult, npcName: string): string {
  const { attitude, description, modifiers } = result;

  let narrative = `${npcName} seems ${attitude.toLowerCase()} toward you. ${description}.`;

  // Add context about significant modifiers if present
  const significantMods = modifiers.filter((mod) => Math.abs(mod.value) >= 10);

  if (significantMods.length > 0) {
    const modTexts = significantMods.map((mod) => {
      if (mod.value > 0) {
        return `Your ${mod.source.toLowerCase()} works in your favor`;
      }
      return `Your ${mod.source.toLowerCase()} works against you`;
    });

    narrative += ` ${modTexts.join('. ')}.`;
  }

  return narrative;
}
