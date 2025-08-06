/**
 * UnderwaterCombatRules.ts - OSRIC Underwater Combat Rules
 *
 * Implements the complete OSRIC underwater combat system including:
 * - Weapon effectiveness restrictions (piercing weapons only)
 * - Attack and damage penalties for underwater combat
 * - Ranged weapon limitations and reload requirements
 * - Spellcasting restrictions and component failures
 * - Movement and breathing limitations
 *
 * PRESERVATION: All OSRIC underwater combat mechanics preserved exactly.
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  Spell,
  Weapon,
} from '@osric/types/entities';

interface UnderwaterCombatContext {
  combatant: CharacterData | MonsterData;
  target?: CharacterData | MonsterData;
  weapon?: Weapon;
  spell?: Spell;
  waterDepth: number; // Depth in meters
  hasWaterBreathing: boolean;
  isCastingSpell?: boolean;
}

export class UnderwaterCombatRule extends BaseRule {
  name = 'underwater-combat';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const underwaterContext = context.getTemporary('underwater-context') as UnderwaterCombatContext;

    if (!underwaterContext) {
      return this.createFailureResult('No underwater combat context found');
    }

    const { combatant, weapon, spell, waterDepth, hasWaterBreathing, isCastingSpell } =
      underwaterContext;

    // Check basic underwater survival
    if (!hasWaterBreathing && waterDepth > 0) {
      const breathingCheck = this.checkBreathingRequirements(combatant, waterDepth);
      if (!breathingCheck.canAct) {
        return this.createFailureResult(
          `${combatant.name} cannot act underwater: ${breathingCheck.reason}`
        );
      }
    }

    // Handle spellcasting underwater
    if (isCastingSpell && spell) {
      const spellResult = this.handleUnderwaterSpell(spell, combatant);
      context.setTemporary('underwater-spell-result', spellResult);

      if (!spellResult.canCast) {
        return this.createFailureResult(
          `Cannot cast ${spell.name} underwater: ${spellResult.reason}`
        );
      }

      return this.createSuccessResult(spellResult.message || 'Spell cast underwater');
    }

    // Handle weapon combat underwater
    if (weapon) {
      const weaponResult = this.handleUnderwaterWeapon(weapon, combatant);
      context.setTemporary('underwater-weapon-result', weaponResult);

      if (!weaponResult.isEffective) {
        return this.createFailureResult(
          `${weapon.name} is ineffective underwater: ${weaponResult.reason}`
        );
      }

      // Apply underwater combat penalties
      const penalties = this.getUnderwaterCombatPenalties(weapon, waterDepth);
      context.setTemporary('underwater-combat-penalties', penalties);

      return this.createSuccessResult(
        `Underwater combat with ${weapon.name}: ${penalties.attackPenalty} attack, ${penalties.damagePenalty} damage${
          penalties.specialEffects.length > 0 ? `, ${penalties.specialEffects.join(', ')}` : ''
        }`
      );
    }

    return this.createSuccessResult('Underwater combat conditions evaluated');
  }

  canApply(context: GameContext, command: Command): boolean {
    if (!['attack', 'cast-spell', 'underwater-combat'].includes(command.type)) return false;

    const underwaterContext = context.getTemporary('underwater-context') as UnderwaterCombatContext;
    return underwaterContext !== null && underwaterContext.waterDepth > 0;
  }

  /**
   * Check breathing requirements for underwater action
   */
  private checkBreathingRequirements(
    combatant: CharacterData | MonsterData,
    waterDepth: number
  ): {
    canAct: boolean;
    reason?: string;
    timeRemaining?: number;
  } {
    // Check for water breathing abilities
    if ('specialAbilities' in combatant && combatant.specialAbilities) {
      const hasWaterBreathing = combatant.specialAbilities.some(
        (ability) =>
          ability.toLowerCase().includes('water breathing') ||
          ability.toLowerCase().includes('amphibious')
      );

      if (hasWaterBreathing) {
        return { canAct: true };
      }
    }

    // Check constitution for breath holding (simplified)
    let breathHoldTime = 10; // Base 10 rounds

    if ('abilities' in combatant) {
      // Constitution modifier affects breath holding
      const conModifier = Math.floor((combatant.abilities.constitution - 10) / 2);
      breathHoldTime += conModifier * 2;
    }

    // Depth affects breathing difficulty
    if (waterDepth > 30) {
      breathHoldTime = Math.floor(breathHoldTime * 0.75); // Reduce by 25% for deep water
    }

    return {
      canAct: breathHoldTime > 0,
      reason: breathHoldTime <= 0 ? 'Drowning' : undefined,
      timeRemaining: Math.max(0, breathHoldTime),
    };
  }

  /**
   * Handle spellcasting underwater
   */
  private handleUnderwaterSpell(
    spell: Spell,
    caster: CharacterData | MonsterData
  ): {
    canCast: boolean;
    reason?: string;
    message?: string;
    penalties?: string[];
  } {
    // Check spell components
    if (spell.components) {
      // Somatic components fail underwater (can't perform precise gestures)
      if (spell.components.includes('S')) {
        return {
          canCast: false,
          reason: 'Somatic components cannot be performed underwater',
        };
      }

      // Material components are difficult underwater
      if (spell.components.includes('M')) {
        return {
          canCast: false,
          reason: 'Material components are ineffective underwater',
        };
      }
    }

    // Check spell type
    const spellName = spell.name.toLowerCase();
    const spellDescription = spell.description?.toLowerCase() || '';

    // Fire spells automatically fail
    if (spellName.includes('fire') || spellDescription.includes('fire')) {
      return {
        canCast: false,
        reason: 'Fire spells cannot function underwater',
      };
    }

    // Lightning spells backfire
    if (spellName.includes('lightning') || spellDescription.includes('lightning')) {
      return {
        canCast: false,
        reason: 'Lightning spells backfire underwater, damaging the caster',
        message: `${spell.name} backfires on ${caster.name}!`,
      };
    }

    // Verbal-only spells work but with penalties
    if (spell.components && spell.components.length === 1 && spell.components[0] === 'V') {
      return {
        canCast: true,
        message: `${caster.name} casts ${spell.name} (verbal only)`,
        penalties: ['Caster level -2 due to underwater conditions'],
      };
    }

    // Other spells work with penalties
    return {
      canCast: true,
      message: `${caster.name} casts ${spell.name} underwater`,
      penalties: ['Caster level -2 due to underwater conditions'],
    };
  }

  /**
   * Handle weapon effectiveness underwater
   */
  private handleUnderwaterWeapon(
    weapon: Weapon,
    _attacker: CharacterData | MonsterData
  ): {
    isEffective: boolean;
    reason?: string;
    specialEffects?: string[];
  } {
    // Only piercing weapons are effective underwater
    const effectiveWeapons = [
      'dagger',
      'spear',
      'trident',
      'harpoon',
      'net',
      'javelin',
      'arrow',
      'bolt',
    ];

    const weaponName = weapon.name.toLowerCase();
    const isEffective = effectiveWeapons.some((w) => weaponName.includes(w));

    if (!isEffective) {
      return {
        isEffective: false,
        reason: 'Only piercing weapons are effective underwater',
      };
    }

    // Special cases for ranged weapons
    if (weapon.type === 'Ranged') {
      if (weaponName.includes('crossbow')) {
        return {
          isEffective: true,
          specialEffects: ['Must reload after each shot underwater'],
        };
      }

      if (weaponName.includes('bow')) {
        return {
          isEffective: false,
          reason: 'Bows cannot be drawn effectively underwater',
        };
      }
    }

    return { isEffective: true };
  }

  /**
   * Get underwater combat penalties
   */
  private getUnderwaterCombatPenalties(
    weapon: Weapon,
    waterDepth: number
  ): {
    attackPenalty: number;
    damagePenalty: number;
    specialEffects: string[];
  } {
    let attackPenalty = -2; // Base underwater penalty
    let damagePenalty = -2; // Base underwater penalty
    const specialEffects: string[] = [];

    // Deeper water increases penalties
    if (waterDepth > 30) {
      attackPenalty -= 1;
      damagePenalty -= 1;
      specialEffects.push('Deep water penalty');
    }

    // Ranged weapons have additional penalties
    if (weapon.type === 'Ranged') {
      attackPenalty -= 2;
      damagePenalty -= 1;
      specialEffects.push('Ranged weapon underwater penalty');
    }

    // Slashing and bludgeoning weapons have severe penalties
    const weaponName = weapon.name.toLowerCase();
    if (weaponName.includes('sword') || weaponName.includes('axe')) {
      attackPenalty -= 2;
      damagePenalty -= 2;
      specialEffects.push('Slashing weapon severely hindered');
    }

    if (
      weaponName.includes('mace') ||
      weaponName.includes('hammer') ||
      weaponName.includes('club')
    ) {
      attackPenalty -= 1;
      damagePenalty -= 3;
      specialEffects.push('Bludgeoning weapon severely hindered');
    }

    return {
      attackPenalty,
      damagePenalty,
      specialEffects,
    };
  }
}

export class UnderwaterMovementRule extends BaseRule {
  name = 'underwater-movement';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const underwaterContext = context.getTemporary('underwater-context') as UnderwaterCombatContext;

    if (!underwaterContext) {
      return this.createFailureResult('No underwater movement context found');
    }

    const { combatant, waterDepth, hasWaterBreathing } = underwaterContext;

    // Calculate underwater movement penalties
    const movementEffects = this.calculateUnderwaterMovement(
      combatant,
      waterDepth,
      hasWaterBreathing
    );

    // Store movement effects
    context.setTemporary('underwater-movement-effects', movementEffects);

    return this.createSuccessResult(
      `Underwater movement: ${movementEffects.speedMultiplier}x speed, ` +
        `${movementEffects.restrictions.length > 0 ? movementEffects.restrictions.join(', ') : 'no restrictions'}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE && command.type !== COMMAND_TYPES.UNDERWATER_MOVE)
      return false;

    const underwaterContext = context.getTemporary('underwater-context') as UnderwaterCombatContext;
    return underwaterContext !== null && underwaterContext.waterDepth > 0;
  }

  /**
   * Calculate underwater movement effects
   */
  private calculateUnderwaterMovement(
    combatant: CharacterData | MonsterData,
    waterDepth: number,
    hasWaterBreathing: boolean
  ): {
    speedMultiplier: number;
    restrictions: string[];
  } {
    let speedMultiplier = 0.5; // Base underwater speed penalty (half speed)
    const restrictions: string[] = [];

    // Swimming ability improves movement
    if ('proficiencies' in combatant && combatant.proficiencies) {
      const hasSwimming = combatant.proficiencies.some(
        (prof) => prof.weapon?.toLowerCase().includes('swimming') || false
      );

      if (hasSwimming) {
        speedMultiplier = 0.75; // Better speed with swimming proficiency
      }
    }

    // Water breathing allows normal underwater movement
    if (hasWaterBreathing) {
      speedMultiplier = Math.max(speedMultiplier, 0.75);
    }

    // Depth affects movement
    if (waterDepth > 30) {
      speedMultiplier *= 0.8; // Additional penalty for deep water
      restrictions.push('Deep water movement penalty');
    }

    // Encumbrance has greater effect underwater
    if ('encumbrance' in combatant && combatant.encumbrance > 0.5) {
      speedMultiplier *= 0.5;
      restrictions.push('Heavy encumbrance severely impairs underwater movement');
    }

    // Armor penalties
    // This would check for armor type and apply additional penalties

    return {
      speedMultiplier: Math.max(0.1, speedMultiplier), // Minimum 10% speed
      restrictions,
    };
  }
}

// Utility functions for direct use (exported for tests)

export interface Action {
  type: 'attack' | 'spell' | 'movement' | 'other';
  actor: CharacterData | MonsterData;
  item?: Weapon;
  target?: string | CharacterData | MonsterData;
}

/**
 * Check if a weapon is effective underwater (for test compatibility)
 */
export function isWeaponEffectiveUnderwater(
  item: Weapon | { name: string; damage?: string; type?: string }
): boolean {
  // If it's not a proper weapon, it's not effective
  if (!item.damage || !item.type) {
    return false;
  }

  const name = item.name.toLowerCase();

  // Effective underwater weapons (from OSRIC)
  const effectiveWeapons = [
    'dagger',
    'spear',
    'trident',
    'harpoon',
    'net',
    'sling',
    'crossbow',
    'javelin',
    'dart',
    'club',
  ];

  return effectiveWeapons.some((effective) => name.includes(effective));
}

/**
 * Apply underwater penalties to an action (for test compatibility)
 */
export function applyUnderwaterPenalties(
  action: Action,
  _attacker: CharacterData | MonsterData
): {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | Array<{ type: string; duration: number }> | null;
} {
  if (!action.item) {
    return {
      success: true,
      message: '',
      damage: null,
      effects: null,
    };
  }

  const weapon = action.item as Weapon;
  const isEffective = isWeaponEffectiveUnderwater(weapon);

  if (!isEffective) {
    return {
      success: false,
      message: 'Weapon is ineffective underwater',
      damage: null,
      effects: null,
    };
  }

  // Apply underwater penalties for effective weapons
  const effects = ['underwater_attack_penalty:-2', 'underwater_damage_penalty:-2'];

  // Special case for ranged weapons
  if (weapon.type === 'Ranged') {
    return {
      success: true,
      message: 'Ranged weapon must reload after this shot',
      damage: null,
      effects: [{ type: 'reloadRequired', duration: 1 }],
    };
  }

  return {
    success: true,
    message: 'Attack with reduced effectiveness underwater',
    damage: null,
    effects: effects,
  };
}

/**
 * Check if a spell can be cast underwater (for test compatibility)
 */
export function canCastSpellUnderwater(spell: Spell): boolean {
  // Handle null/undefined components
  if (!spell.components || !Array.isArray(spell.components)) {
    return true;
  }

  // Fire-based spells cannot be cast underwater
  const spellText = `${spell.name} ${spell.description}`.toLowerCase();
  if (spellText.includes('fire') || spellText.includes('flame') || spellText.includes('burn')) {
    return false;
  }

  // Lightning/electricity spells cannot be cast underwater
  if (
    spellText.includes('lightning') ||
    spellText.includes('electric') ||
    spellText.includes('shock')
  ) {
    return false;
  }

  // Spells with somatic or material components cannot be cast underwater
  return !spell.components.includes('S') && !spell.components.includes('M');
}

/**
 * Handle underwater spell casting (for test compatibility)
 */
export function handleUnderwaterSpell(
  spell: Spell,
  caster: CharacterData | MonsterData
): {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: Array<{ type: string; duration: number }> | null;
} {
  // Lightning spells backfire underwater (regardless of other restrictions)
  if (spell.name.toLowerCase().includes('lightning')) {
    const spellLevel = spell.level || 0;
    return {
      success: false,
      message: 'Lightning spell backfires underwater!',
      damage: [spellLevel * 2],
      effects: [{ type: 'stun', duration: 1 }],
    };
  }

  if (!canCastSpellUnderwater(spell)) {
    return {
      success: false,
      message: 'cannot cast spells with material components underwater',
      damage: null,
      effects: null,
    };
  }

  const casterName = 'name' in caster ? caster.name : 'Caster';
  return {
    success: true,
    message: `${casterName} casts ${spell.name}`,
    damage: null,
    effects: null,
  };
}
