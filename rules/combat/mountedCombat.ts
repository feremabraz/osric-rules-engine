import type { Action, ActionResult, Character, Monster, Weapon } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Represents a mount in the game
 */
export interface Mount {
  id: string;
  name: string;
  type: string;
  movementRate: number;
  armorClass: number;
  hitPoints: number;
  size: 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  flying: boolean;
  flyingAgility: AerialAgilityLevel | null;
  encumbrance: {
    current: number;
    max: number;
  };
  isEncumbered: boolean;
  mountedBy: string | null; // Character ID of the rider
}

/**
 * Aerial Agility Levels for flying creatures
 */
export enum AerialAgilityLevel {
  Drifting = 1, // e.g., levitate
  Poor = 2, // e.g., dragon
  Average = 3, // e.g., sphinx
  Good = 4, // e.g., flying carpet
  Excellent = 5, // e.g., pegasus
  Perfect = 6, // e.g., genie, air elemental
}

/**
 * Checks if a character can perform a mounted charge
 */
export function canMountedCharge(character: Character, mount: Mount): boolean {
  // Check if mount is capable of charging
  if (mount.isEncumbered) {
    return false;
  }

  // Check if character is at maximum encumbrance
  const isCharacterHeavilyEncumbered = character.encumbrance >= 0.9; // Assuming 90%+ is max

  return !isCharacterHeavilyEncumbered && mount.mountedBy === character.id;
}

/**
 * Handles mounted charge attack
 */
export function resolveMountedCharge(action: Action): ActionResult {
  const { actor, target, item } = action;

  if (!target || !item || !('damage' in item)) {
    return {
      success: false,
      message: 'Invalid mounted charge action',
      damage: null,
      effects: null,
    };
  }

  const weapon = item as Weapon;

  // Check if using a lance (only weapon that gets charge bonus)
  const isLance = weapon.name.toLowerCase().includes('lance');

  // Double movement for charge
  // This would be handled by the movement system, but we'll note it here

  // Apply double damage for lance charge
  // Note: Actual damage calculation would be handled by the damage system
  // This is just indicating the multiplier
  const damageMultiplier = isLance ? 2 : 1;

  return {
    success: true,
    message: `${actor.name} charges on their mount with ${weapon.name}!`,
    damage: null, // Actual damage calculated in damage system
    effects: [
      {
        type: 'damageMultiplier',
        value: damageMultiplier,
        source: 'mountedCharge',
        duration: 1, // Only applies to this attack
      },
    ],
  };
}

/**
 * Handles dismounting from a mount
 */
export function dismount(character: Character, mount: Mount): ActionResult {
  if (mount.mountedBy !== character.id) {
    return {
      success: false,
      message: `${character.name} is not mounted on ${mount.name}`,
      damage: null,
      effects: null,
    };
  }

  mount.mountedBy = null;

  // Check for falling damage if dismounting while flying
  if (mount.flying) {
    // This would be handled by the falling damage system
    return {
      success: true,
      message: `${character.name} dismounts from ${mount.name} while flying!`,
      damage: null,
      effects: [
        {
          type: 'falling',
          source: 'dismount',
          duration: 1, // Duration of 1 round for the falling effect
          distance: mount.size === 'Large' ? 10 : 5,
        } as const,
      ],
    };
  }

  return {
    success: true,
    message: `${character.name} dismounts from ${mount.name}.`,
    damage: null,
    effects: null,
  };
}
