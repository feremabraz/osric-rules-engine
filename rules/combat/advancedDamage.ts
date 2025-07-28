import type { Character, Monster, StatusEffect } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Bleeding damage effect
 * This implements OSRIC's bleeding mechanics for specialized weapons and effects
 */
export interface BleedingEffect {
  target: Character | Monster;
  damagePerRound: number;
  remainingRounds: number;
  source: string; // Description of what caused the bleeding
}

/**
 * Active bleeding effects tracked by entity ID
 */
const activeBleedingEffects: Record<string, BleedingEffect[]> = {};

/**
 * Apply a bleeding effect to a target
 */
export const applyBleedingEffect = (
  target: Character | Monster,
  baseDamage: number,
  source: string,
  maxRounds = 10
): StatusEffect => {
  // Calculate damage per round (same as base damage)
  const damagePerRound = baseDamage;

  // Create the bleeding effect
  const bleedEffect: BleedingEffect = {
    target,
    damagePerRound,
    remainingRounds: maxRounds,
    source,
  };

  // Store the effect
  if (!activeBleedingEffects[target.id]) {
    activeBleedingEffects[target.id] = [];
  }

  activeBleedingEffects[target.id].push(bleedEffect);

  // Create a status effect for the target
  const statusEffect: StatusEffect = {
    name: 'Bleeding',
    duration: maxRounds,
    effect: `Taking ${damagePerRound} damage per round for ${maxRounds} rounds`,
    savingThrow: null,
    endCondition: 'Wounds are bound, or healing magic is applied',
  };

  return statusEffect;
};

/**
 * Process the bleeding damage for a round
 * Returns total bleeding damage dealt and a message
 */
export const processBleedingEffects = (
  target: Character | Monster
): {
  totalDamage: number;
  effects: BleedingEffect[];
  message: string;
} => {
  // Check if target has any bleeding effects
  const effects = activeBleedingEffects[target.id] || [];

  if (effects.length === 0) {
    return {
      totalDamage: 0,
      effects: [],
      message: '',
    };
  }

  let totalDamage = 0;
  const activeEffects: BleedingEffect[] = [];
  const expiredEffects: BleedingEffect[] = [];

  // Process each bleeding effect
  for (const effect of effects) {
    // Apply damage
    totalDamage += effect.damagePerRound;

    // Decrement remaining rounds
    effect.remainingRounds--;

    // Check if effect is still active
    if (effect.remainingRounds > 0) {
      activeEffects.push(effect);
    } else {
      expiredEffects.push(effect);
    }
  }

  // Update active effects
  activeBleedingEffects[target.id] = activeEffects;

  // Build message
  let message = '';
  if (totalDamage > 0) {
    message = `${target.name} takes ${totalDamage} bleeding damage`;

    if (expiredEffects.length > 0) {
      message += `. ${expiredEffects.length} bleeding ${expiredEffects.length === 1 ? 'wound has' : 'wounds have'} stopped bleeding`;
    }

    if (activeEffects.length > 0) {
      message += `. ${activeEffects.length} ${activeEffects.length === 1 ? 'wound continues' : 'wounds continue'} to bleed`;
    }

    message += '.';
  }

  return {
    totalDamage,
    effects: activeEffects,
    message,
  };
};

/**
 * Stop bleeding effects on a target (e.g., through binding wounds)
 */
export const bindWounds = (
  target: Character | Monster
): {
  effectsStopped: number;
  message: string;
} => {
  const effects = activeBleedingEffects[target.id] || [];
  const numEffects = effects.length;

  // Clear all bleeding effects
  activeBleedingEffects[target.id] = [];

  return {
    effectsStopped: numEffects,
    message:
      numEffects > 0
        ? `${target.name}'s wounds are bound, stopping ${numEffects} bleeding ${numEffects === 1 ? 'effect' : 'effects'}.`
        : `${target.name} has no bleeding wounds to bind.`,
  };
};

/**
 * Regeneration for creatures with that ability
 */
export interface RegenerationAbility {
  hpPerRound: number;
  exceptions: string[]; // Damage types that prevent regeneration (e.g., "fire", "acid")
}

/**
 * Process regeneration for a creature
 * Returns the HP regenerated and a message
 */
export const processRegeneration = (
  creature: Monster,
  regenerationAbility: RegenerationAbility,
  damageTypesReceived: string[] = []
): {
  hpRegained: number;
  message: string;
} => {
  // Check if any received damage types prevent regeneration
  const preventRegeneration = damageTypesReceived.some((type) =>
    regenerationAbility.exceptions.includes(type.toLowerCase())
  );

  if (preventRegeneration) {
    return {
      hpRegained: 0,
      message: `${creature.name} cannot regenerate due to damage from ${damageTypesReceived.join(', ')}.`,
    };
  }

  // Calculate HP to regenerate
  const currentHP = creature.hitPoints.current;
  const maxHP = creature.hitPoints.maximum;

  if (currentHP >= maxHP) {
    return {
      hpRegained: 0,
      message: `${creature.name} is already at maximum hit points.`,
    };
  }

  // Regenerate HP
  const hpRegained = Math.min(regenerationAbility.hpPerRound, maxHP - currentHP);

  return {
    hpRegained,
    message: `${creature.name} regenerates ${hpRegained} hit points.`,
  };
};

/**
 * Critical hit table system (optional ruleset)
 * OSRIC doesn't have official critical hit tables, but many GMs use them
 */
export interface CriticalHitEffect {
  name: string;
  description: string;
  effect: (target: Character | Monster) => StatusEffect | null;
}

/**
 * Sample critical hit table
 * These effects can be customized by the GM
 */
export const sampleCriticalHitTable: CriticalHitEffect[] = [
  {
    name: 'Stunning Blow',
    description: 'Target is stunned for 1 round.',
    effect: () => ({
      name: 'Stunned',
      duration: 1,
      effect: 'Cannot attack or cast spells',
      savingThrow: null,
      endCondition: null,
    }),
  },
  {
    name: 'Bleeding Wound',
    description: 'Target bleeds for 2 damage per round for 5 rounds.',
    effect: (target) => applyBleedingEffect(target, 2, 'Critical Hit', 5),
  },
  {
    name: 'Disarm',
    description: 'Target drops primary weapon.',
    effect: () => ({
      name: 'Disarmed',
      duration: 1,
      effect: 'Dropped primary weapon',
      savingThrow: null,
      endCondition: 'Spend a round to recover weapon',
    }),
  },
  {
    name: 'Armor Damage',
    description: "Target's armor AC is reduced by 1.",
    effect: () => ({
      name: 'Damaged Armor',
      duration: -1, // Until repaired
      effect: 'AC reduced by 1',
      savingThrow: null,
      endCondition: 'Armor is repaired',
    }),
  },
  {
    name: 'Double Damage',
    description: 'Attack deals double damage.',
    effect: () => null, // Handled separately in damage calculation
  },
  {
    name: 'Grievous Wound',
    description: 'Target takes an additional 1d6 damage and is slowed.',
    effect: () => ({
      name: 'Grievous Wound',
      duration: 3,
      effect: 'Movement reduced by half',
      savingThrow: 'Paralysis, Polymorph, or Petrification',
      endCondition: null,
    }),
  },
];

/**
 * Roll on critical hit table
 */
export const rollCriticalHitEffect = (): CriticalHitEffect => {
  const index = roll(sampleCriticalHitTable.length) - 1;
  return sampleCriticalHitTable[index];
};

/**
 * Fumble table system (optional ruleset)
 */
export interface FumbleEffect {
  name: string;
  description: string;
  effect: (fumbler: Character | Monster) => StatusEffect | null;
}

/**
 * Sample fumble table
 */
export const sampleFumbleTable: FumbleEffect[] = [
  {
    name: 'Off Balance',
    description: 'You are off balance for 1 round.',
    effect: () => ({
      name: 'Off Balance',
      duration: 1,
      effect: '-2 to attack rolls and AC',
      savingThrow: null,
      endCondition: null,
    }),
  },
  {
    name: 'Dropped Weapon',
    description: 'You drop your weapon.',
    effect: () => ({
      name: 'Dropped Weapon',
      duration: 1,
      effect: 'Weapon on ground',
      savingThrow: null,
      endCondition: 'Spend a round to recover weapon',
    }),
  },
  {
    name: 'Stumble',
    description: 'You stumble and fall prone.',
    effect: () => ({
      name: 'Prone',
      duration: 1,
      effect: '-4 to attack rolls, +2 to be hit',
      savingThrow: null,
      endCondition: 'Spend a round to stand up',
    }),
  },
  {
    name: 'Weapon Stuck',
    description: 'Your weapon is stuck in a nearby surface.',
    effect: () => ({
      name: 'Weapon Stuck',
      duration: 1,
      effect: 'Weapon unavailable',
      savingThrow: null,
      endCondition: 'Spend a round with a successful strength check to free weapon',
    }),
  },
  {
    name: 'Hit Self',
    description: 'You hit yourself with your own weapon.',
    effect: () => null, // Damage handled separately
  },
  {
    name: 'Hit Ally',
    description: 'You hit a nearby ally.',
    effect: () => null, // Damage handled separately
  },
];

/**
 * Roll on fumble table
 */
export const rollFumbleEffect = (): FumbleEffect => {
  const index = roll(sampleFumbleTable.length) - 1;
  return sampleFumbleTable[index];
};

/**
 * Massive damage system (optional ruleset).
 * Checks if a character needs to make a save vs. death when taking massive damage.
 */
export const checkMassiveDamage = (damageDealt: number, damageThreshold = 50): boolean => {
  // Check if damage exceeds threshold
  return damageDealt >= damageThreshold;
};
