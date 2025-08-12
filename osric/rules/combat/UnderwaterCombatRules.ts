import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { Spell } from '@osric/types/spell';

interface UnderwaterCombatContext {
  combatant: CharacterData | MonsterData;
  target?: CharacterData | MonsterData;
  weapon?: Weapon;
  spell?: Spell;
  waterDepth: number;
  hasWaterBreathing: boolean;
  isCastingSpell?: boolean;
}

import { ContextKeys } from '@osric/core/ContextKeys';

export class UnderwaterCombatRules extends BaseRule {
  name = 'underwater-combat';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;

    if (!underwaterContext) {
      return this.createFailureResult('No underwater combat context found');
    }

    const { combatant, weapon, spell, waterDepth, hasWaterBreathing, isCastingSpell } =
      underwaterContext;

    if (!hasWaterBreathing && waterDepth > 0) {
      const breathingCheck = this.checkBreathingRequirements(combatant, waterDepth);
      if (!breathingCheck.canAct) {
        return this.createFailureResult(
          `${combatant.name} cannot act underwater: ${breathingCheck.reason}`
        );
      }
    }

    if (isCastingSpell && spell) {
      const spellResult = this.handleUnderwaterSpell(spell, combatant);
      context.setTemporary(ContextKeys.COMBAT_UNDERWATER_SPELL_RESULT, spellResult);

      if (!spellResult.canCast) {
        return this.createFailureResult(
          `Cannot cast ${spell.name} underwater: ${spellResult.reason}`
        );
      }

      return this.createSuccessResult(spellResult.message || 'Spell cast underwater');
    }

    if (weapon) {
      const weaponResult = this.handleUnderwaterWeapon(weapon, combatant);
      context.setTemporary(ContextKeys.COMBAT_UNDERWATER_WEAPON_RESULT, weaponResult);

      if (!weaponResult.isEffective) {
        return this.createFailureResult(
          `${weapon.name} is ineffective underwater: ${weaponResult.reason}`
        );
      }

      const penalties = this.getUnderwaterCombatPenalties(weapon, waterDepth);
      context.setTemporary(ContextKeys.COMBAT_UNDERWATER_COMBAT_PENALTIES, penalties);

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

    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;
    return underwaterContext !== null && underwaterContext.waterDepth > 0;
  }

  private checkBreathingRequirements(
    combatant: CharacterData | MonsterData,
    waterDepth: number
  ): {
    canAct: boolean;
    reason?: string;
    timeRemaining?: number;
  } {
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

    let breathHoldTime = 10;

    if ('abilities' in combatant) {
      const conModifier = Math.floor((combatant.abilities.constitution - 10) / 2);
      breathHoldTime += conModifier * 2;
    }

    if (waterDepth > 30) {
      breathHoldTime = Math.floor(breathHoldTime * 0.75);
    }

    return {
      canAct: breathHoldTime > 0,
      reason: breathHoldTime <= 0 ? 'Drowning' : undefined,
      timeRemaining: Math.max(0, breathHoldTime),
    };
  }

  private handleUnderwaterSpell(
    spell: Spell,
    caster: CharacterData | MonsterData
  ): {
    canCast: boolean;
    reason?: string;
    message?: string;
    penalties?: string[];
  } {
    if (spell.components) {
      if (spell.components.includes('S')) {
        return {
          canCast: false,
          reason: 'Somatic components cannot be performed underwater',
        };
      }

      if (spell.components.includes('M')) {
        return {
          canCast: false,
          reason: 'Material components are ineffective underwater',
        };
      }
    }

    const spellName = spell.name.toLowerCase();
    const spellDescription = spell.description?.toLowerCase() || '';

    if (spellName.includes('fire') || spellDescription.includes('fire')) {
      return {
        canCast: false,
        reason: 'Fire spells cannot function underwater',
      };
    }

    if (spellName.includes('lightning') || spellDescription.includes('lightning')) {
      return {
        canCast: false,
        reason: 'Lightning spells backfire underwater, damaging the caster',
        message: `${spell.name} backfires on ${caster.name}!`,
      };
    }

    if (spell.components && spell.components.length === 1 && spell.components[0] === 'V') {
      return {
        canCast: true,
        message: `${caster.name} casts ${spell.name} (verbal only)`,
        penalties: ['Caster level -2 due to underwater conditions'],
      };
    }

    return {
      canCast: true,
      message: `${caster.name} casts ${spell.name} underwater`,
      penalties: ['Caster level -2 due to underwater conditions'],
    };
  }

  private handleUnderwaterWeapon(
    weapon: Weapon,
    _attacker: CharacterData | MonsterData
  ): {
    isEffective: boolean;
    reason?: string;
    specialEffects?: string[];
  } {
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

  private getUnderwaterCombatPenalties(
    weapon: Weapon,
    waterDepth: number
  ): {
    attackPenalty: number;
    damagePenalty: number;
    specialEffects: string[];
  } {
    let attackPenalty = -2;
    let damagePenalty = -2;
    const specialEffects: string[] = [];

    if (waterDepth > 30) {
      attackPenalty -= 1;
      damagePenalty -= 1;
      specialEffects.push('Deep water penalty');
    }

    if (weapon.type === 'Ranged') {
      attackPenalty -= 2;
      damagePenalty -= 1;
      specialEffects.push('Ranged weapon underwater penalty');
    }

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

export class UnderwaterMovementRules extends BaseRule {
  name = 'underwater-movement';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;

    if (!underwaterContext) {
      return this.createFailureResult('No underwater movement context found');
    }

    const { combatant, waterDepth, hasWaterBreathing } = underwaterContext;

    const movementEffects = this.calculateUnderwaterMovement(
      combatant,
      waterDepth,
      hasWaterBreathing
    );

    context.setTemporary(ContextKeys.COMBAT_UNDERWATER_MOVEMENT_EFFECTS, movementEffects);

    return this.createSuccessResult(
      `Underwater movement: ${movementEffects.speedMultiplier}x speed, ` +
        `${movementEffects.restrictions.length > 0 ? movementEffects.restrictions.join(', ') : 'no restrictions'}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE && command.type !== COMMAND_TYPES.UNDERWATER_MOVE)
      return false;

    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;
    return underwaterContext !== null && underwaterContext.waterDepth > 0;
  }

  private calculateUnderwaterMovement(
    combatant: CharacterData | MonsterData,
    waterDepth: number,
    hasWaterBreathing: boolean
  ): {
    speedMultiplier: number;
    restrictions: string[];
  } {
    let speedMultiplier = 0.5;
    const restrictions: string[] = [];

    if ('proficiencies' in combatant && combatant.proficiencies) {
      const hasSwimming = combatant.proficiencies.some(
        (prof) => prof.weapon?.toLowerCase().includes('swimming') || false
      );

      if (hasSwimming) {
        speedMultiplier = 0.75;
      }
    }

    if (hasWaterBreathing) {
      speedMultiplier = Math.max(speedMultiplier, 0.75);
    }

    if (waterDepth > 30) {
      speedMultiplier *= 0.8;
      restrictions.push('Deep water movement penalty');
    }

    if ('encumbrance' in combatant && combatant.encumbrance > 0.5) {
      speedMultiplier *= 0.5;
      restrictions.push('Heavy encumbrance severely impairs underwater movement');
    }

    return {
      speedMultiplier: Math.max(0.1, speedMultiplier),
      restrictions,
    };
  }
}

export interface Action {
  type: 'attack' | 'spell' | 'movement' | 'other';
  actor: CharacterData | MonsterData;
  item?: Weapon;
  target?: string | CharacterData | MonsterData;
}

export function isWeaponEffectiveUnderwater(
  item: Weapon | { name: string; damage?: string; type?: string }
): boolean {
  if (!item.damage || !item.type) {
    return false;
  }

  const name = item.name.toLowerCase();

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

export function applyUnderwaterPenalties(
  action: Action,
  _attacker: CharacterData | MonsterData
): {
  kind: 'success' | 'failure';
  message: string;
  damage: number[] | null;
  effects: string[] | Array<{ type: string; duration: number }> | null;
} {
  if (!action.item) {
    return {
      kind: 'success',
      message: '',
      damage: null,
      effects: null,
    };
  }

  const weapon = action.item as Weapon;
  const isEffective = isWeaponEffectiveUnderwater(weapon);

  if (!isEffective) {
    return {
      kind: 'failure',
      message: 'Weapon is ineffective underwater',
      damage: null,
      effects: null,
    };
  }

  const effects = ['underwater_attack_penalty:-2', 'underwater_damage_penalty:-2'];

  if (weapon.type === 'Ranged') {
    return {
      kind: 'success',
      message: 'Ranged weapon must reload after this shot',
      damage: null,
      effects: [{ type: 'reloadRequired', duration: 1 }],
    };
  }

  return {
    kind: 'success',
    message: 'Attack with reduced effectiveness underwater',
    damage: null,
    effects: effects,
  };
}

export function canCastSpellUnderwater(spell: Spell): boolean {
  if (!spell.components || !Array.isArray(spell.components)) {
    return true;
  }

  const spellText = `${spell.name} ${spell.description}`.toLowerCase();
  if (spellText.includes('fire') || spellText.includes('flame') || spellText.includes('burn')) {
    return false;
  }

  if (
    spellText.includes('lightning') ||
    spellText.includes('electric') ||
    spellText.includes('shock')
  ) {
    return false;
  }

  return !spell.components.includes('S') && !spell.components.includes('M');
}

export function handleUnderwaterSpell(
  spell: Spell,
  caster: CharacterData | MonsterData
): {
  kind: 'success' | 'failure';
  message: string;
  damage: number[] | null;
  effects: Array<{ type: string; duration: number }> | null;
} {
  if (spell.name.toLowerCase().includes('lightning')) {
    const spellLevel = spell.level || 0;
    return {
      kind: 'failure',
      message: 'Lightning spell backfires underwater!',
      damage: [spellLevel * 2],
      effects: [{ type: 'stun', duration: 1 }],
    };
  }

  if (!canCastSpellUnderwater(spell)) {
    return {
      kind: 'failure',
      message: 'cannot cast spells with material components underwater',
      damage: null,
      effects: null,
    };
  }

  const casterName = 'name' in caster ? caster.name : 'Caster';
  return {
    kind: 'success',
    message: `${casterName} casts ${spell.name}`,
    damage: null,
    effects: null,
  };
}
