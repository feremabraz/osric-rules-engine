import type {
  Action,
  ActionResult,
  Character,
  StatusEffect,
  Weapon,
  WeaponProficiency,
} from '@rules/types';

import { applyBleedingEffect } from '@rules/combat/advancedDamage';
import {
  getDiveAttackBonus,
  handleAerialMovement,
  mountFlyingCreature,
} from '@rules/combat/aerialCombat';
// Import only the functions needed for resolveCombat
import { attackRoll } from '@rules/combat/attackRoll';
import { applyDamage } from '@rules/combat/damage';
import { resolveGrapple } from '@rules/combat/grappling';
import {
  AerialAgilityLevel,
  canMountedCharge,
  dismount,
  resolveMountedCharge,
} from '@rules/combat/mountedCombat';
import { getAttacksPerRound, resolveMultipleAttacks } from '@rules/combat/multipleAttacks';
import { getNonProficiencyPenalty } from '@rules/combat/proficiency';
import { getSpecializationHitBonus } from '@rules/combat/specialization';
import { resolveTwoWeaponAttack } from '@rules/combat/twoWeaponFighting';
import {
  applyUnderwaterPenalties,
  canCastSpellUnderwater,
  handleUnderwaterSpell,
  isWeaponEffectiveUnderwater,
} from '@rules/combat/underwaterCombat';
import { applyWeaponVsArmorAdjustment } from '@rules/combat/weaponVsArmor';

import type { AerialMovement } from '@rules/combat/aerialCombat';
// Type imports
import type { Mount } from '@rules/combat/mountedCombat';

// Export all combat-related functions for easy importing
export * from '@rules/combat/attackRoll';
export * from '@rules/combat/weaponVsArmor';
export * from '@rules/combat/proficiency';
export * from '@rules/combat/damage';
export * from '@rules/combat/initiative';
export * from '@rules/combat/death';
export * from '@rules/combat/specialization';
export * from '@rules/combat/multipleAttacks';
export * from '@rules/combat/twoWeaponFighting';
export * from '@rules/combat/grappling';
export * from '@rules/combat/shields';
export * from '@rules/combat/advancedDamage';

// Mounted Combat
export { canMountedCharge, resolveMountedCharge, dismount, AerialAgilityLevel };

// Aerial Combat
export { handleAerialMovement, getDiveAttackBonus, mountFlyingCreature };

// Underwater Combat
export {
  isWeaponEffectiveUnderwater,
  applyUnderwaterPenalties,
  canCastSpellUnderwater,
  handleUnderwaterSpell,
};

// Export types
export type { Mount, AerialMovement };

/**
 * Main combat resolution function that combines all aspects of combat
 * Now supporting advanced combat features like multiple attacks, weapon specialization,
 * two-weapon fighting, and more.
 */
export const resolveCombat = (action: Action): ActionResult => {
  const { actor, target, item } = action;

  if (!target || typeof target === 'string') {
    return {
      success: false,
      message: 'No valid target specified for combat action.',
      damage: null,
      effects: null,
    };
  }

  // Check if this is a special combat action
  if (action.type === 'Grapple') {
    const grappleResult = resolveGrapple(actor, target);
    return {
      success: grappleResult.hit,
      message: grappleResult.message,
      damage: grappleResult.damage.length > 0 ? grappleResult.damage : null,
      effects: grappleResult.specialEffects
        ? grappleResult.specialEffects.map((effect) => effect.name)
        : null,
    };
  }

  // Check if the actor has a weapon
  const weapon = item as Weapon | undefined;
  const offhandWeapon = action.offhandItem as Weapon | undefined;

  // Handle two-weapon fighting
  if (weapon && offhandWeapon && 'class' in actor) {
    const result = resolveTwoWeaponAttack(actor as Character, target, weapon, offhandWeapon);

    // Combine results from both attacks
    const totalDamage: number[] = [];
    if (result.mainHandResult.damage && result.mainHandResult.damage.length > 0) {
      totalDamage.push(...result.mainHandResult.damage);
    }
    if (result.offHandResult.damage && result.offHandResult.damage.length > 0) {
      totalDamage.push(...result.offHandResult.damage);
    }

    return {
      success: result.mainHandResult.hit || result.offHandResult.hit,
      message: `${result.mainHandResult.message}\n${result.offHandResult.message}`,
      damage: totalDamage.length > 0 ? totalDamage : null,
      effects:
        result.mainHandResult.specialEffects || result.offHandResult.specialEffects
          ? (result.mainHandResult.specialEffects || [])
              .concat(result.offHandResult.specialEffects || [])
              .map((effect) => effect.name)
          : null,
    };
  }

  // Get weapon vs. armor adjustment if applicable
  let attackModifier = 0;
  if (weapon) {
    attackModifier += applyWeaponVsArmorAdjustment(target, weapon);
  }

  // Check if character is proficient with the weapon
  if ('class' in actor && weapon) {
    if (!actor.proficiencies.some((wp: WeaponProficiency) => wp.weapon === weapon.name)) {
      attackModifier += getNonProficiencyPenalty(actor.class);
    } else {
      // Add weapon specialization bonuses if applicable
      attackModifier += getSpecializationHitBonus(actor, weapon);
    }
  }

  // Check if actor has multiple attacks
  if ('class' in actor) {
    // Get the number of attacks per round
    const attacksPerRound = getAttacksPerRound(
      actor,
      weapon,
      'hitDice' in target && (typeof target.hitDice === 'number' ? target.hitDice < 1 : false)
    );

    if (attacksPerRound > 1) {
      // Handle multiple attacks
      const multipleAttackResults = resolveMultipleAttacks(actor, target, weapon, attackModifier);

      // Combine damage from all hits
      const totalDamage: number[] = [];
      let combinedMessage = '';
      const allSpecialEffects: StatusEffect[] = [];
      let anyHits = false;

      for (const result of multipleAttackResults.results) {
        if (result.hit) {
          anyHits = true;
          if (result.damage && result.damage.length > 0) {
            totalDamage.push(...result.damage);
          }
          if (result.specialEffects) {
            allSpecialEffects.push(...result.specialEffects);
          }
        }
        combinedMessage += `${result.message}\n`;

        // Process damage
        if (result.hit) {
          // Check if this attack causes bleeding
          if (weapon?.name?.toLowerCase().includes('bleeding')) {
            const bleedingEffect = applyBleedingEffect(
              target,
              result.damage && result.damage.length > 0 ? result.damage[0] : 1,
              `${weapon.name} wound`,
              10
            );

            // Add bleeding effect
            if (result.specialEffects === null) {
              result.specialEffects = [];
            }
            result.specialEffects.push(bleedingEffect);

            // Update message
            result.message += ` The wound continues to bleed for ${bleedingEffect.duration} rounds.`;
          }
        }
      }

      // Process damage
      if (anyHits && totalDamage.length > 0) {
        applyDamage(actor, target, totalDamage, false);
      }

      return {
        success: anyHits,
        message: combinedMessage.trim(),
        damage: totalDamage.length > 0 ? totalDamage : null,
        effects:
          allSpecialEffects.length > 0 ? allSpecialEffects.map((effect) => effect.name) : null,
      };
    }
  }

  // Perform single attack roll
  const attackResult = attackRoll(actor, target, weapon, attackModifier);

  // Process damage
  if (attackResult.hit) {
    // Apply damage and get updated combat result with status effects
    const damageResult = applyDamage(actor, target, attackResult.damage, attackResult.critical);

    // Use the updated message which includes unconsciousness if applicable
    return {
      success: true,
      message: damageResult.message,
      damage: damageResult.damage.length > 0 ? damageResult.damage : null,
      effects: damageResult.specialEffects
        ? damageResult.specialEffects.map((effect) => effect.name)
        : null,
    };
  }

  // Attack missed
  return {
    success: false,
    message: attackResult.message,
    damage: null,
    effects: null,
  };
};
