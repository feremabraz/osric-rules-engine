import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';

type WeaponType = 'Slashing' | 'Piercing' | 'Bludgeoning';
type ArmorCategory =
  | 'Unarmored'
  | 'Padded/Leather'
  | 'StuddedLeather/Ring'
  | 'Scale/Chain'
  | 'Banded/Splint'
  | 'Plate';

interface WeaponVsArmorContext {
  attacker: CharacterData | MonsterData;
  defender: CharacterData | MonsterData;
  weapon: Weapon;
}

export class WeaponVsArmorRules extends BaseRule {
  name = RULE_NAMES.WEAPON_VS_ARMOR;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const weaponArmorContext = context.getTemporary(
      ContextKeys.COMBAT_WEAPON_ARMOR_CONTEXT
    ) as WeaponVsArmorContext;

    if (!weaponArmorContext) {
      return this.createFailureResult('No weapon vs armor context found');
    }

    const { defender, weapon } = weaponArmorContext;

    const adjustment = this.getWeaponVsArmorAdjustment(weapon, defender.armorClass);

    context.setTemporary(ContextKeys.COMBAT_WEAPON_VS_ARMOR_ADJUSTMENT, adjustment);

    const adjustmentText =
      adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : '0';

    return this.createSuccessResult(
      `Weapon vs armor adjustment: ${adjustmentText} (${this.getWeaponType(weapon)} vs ${this.getArmorCategory(defender.armorClass)})`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const weaponArmorContext = context.getTemporary(
      ContextKeys.COMBAT_WEAPON_ARMOR_CONTEXT
    ) as WeaponVsArmorContext;
    return weaponArmorContext !== null;
  }

  private readonly WEAPON_VS_ARMOR_TABLE: Record<WeaponType, Record<ArmorCategory, number>> = {
    Slashing: {
      Unarmored: 0,
      'Padded/Leather': -1,
      'StuddedLeather/Ring': 0,
      'Scale/Chain': 0,
      'Banded/Splint': +1,
      Plate: +2,
    },
    Piercing: {
      Unarmored: 0,
      'Padded/Leather': +1,
      'StuddedLeather/Ring': 0,
      'Scale/Chain': -1,
      'Banded/Splint': -2,
      Plate: -3,
    },
    Bludgeoning: {
      Unarmored: 0,
      'Padded/Leather': 0,
      'StuddedLeather/Ring': +1,
      'Scale/Chain': +2,
      'Banded/Splint': 0,
      Plate: -1,
    },
  };

  private readonly WEAPON_DAMAGE_TYPES: Record<string, WeaponType> = {
    'Sword, Long': 'Slashing',
    'Sword, Short': 'Slashing',
    'Sword, Broad': 'Slashing',
    'Sword, Bastard': 'Slashing',
    'Sword, Two-Handed': 'Slashing',
    'Axe, Battle': 'Slashing',
    'Axe, Hand': 'Slashing',
    Scimitar: 'Slashing',
    Falchion: 'Slashing',

    Dagger: 'Piercing',
    Spear: 'Piercing',
    Arrow: 'Piercing',
    Bolt: 'Piercing',
    Trident: 'Piercing',
    'Bow, Short': 'Piercing',
    'Bow, Long': 'Piercing',
    'Crossbow, Light': 'Piercing',
    'Crossbow, Heavy': 'Piercing',
    Pike: 'Piercing',
    Javelin: 'Piercing',

    Mace: 'Bludgeoning',
    'Hammer, War': 'Bludgeoning',
    Club: 'Bludgeoning',
    Flail: 'Bludgeoning',
    'Morning Star': 'Bludgeoning',
    Staff: 'Bludgeoning',
    Quarterstaff: 'Bludgeoning',
    Maul: 'Bludgeoning',
  };

  private readonly AC_TO_ARMOR_CATEGORY: Record<number, ArmorCategory> = {
    10: 'Unarmored',
    9: 'Padded/Leather',
    8: 'Padded/Leather',
    7: 'StuddedLeather/Ring',
    6: 'StuddedLeather/Ring',
    5: 'Scale/Chain',
    4: 'Scale/Chain',
    3: 'Banded/Splint',
    2: 'Plate',
    1: 'Plate',
    0: 'Plate',
  };

  public getWeaponVsArmorAdjustment(weapon: Weapon, targetAC: number): number {
    const damageType = this.getWeaponType(weapon);

    const armorCategory = this.getArmorCategory(targetAC);

    return this.WEAPON_VS_ARMOR_TABLE[damageType][armorCategory];
  }

  private getWeaponType(weapon: Weapon): WeaponType {
    return this.WEAPON_DAMAGE_TYPES[weapon.name] || 'Slashing';
  }

  private getArmorCategory(targetAC: number): ArmorCategory {
    const boundedAC = Math.min(Math.max(targetAC, 0), 10);
    return this.AC_TO_ARMOR_CATEGORY[boundedAC] || 'Unarmored';
  }
}

// WeaponTypeRules and ArmorCategoryRules moved to dedicated files for compliance.

export function getWeaponVsArmorAdjustment(weapon: Weapon, targetAC: number): number {
  const rule = new WeaponVsArmorRules();
  return rule.getWeaponVsArmorAdjustment(weapon, targetAC);
}

export function applyWeaponVsArmorAdjustment(
  target: CharacterData | MonsterData,
  weapon: Weapon | undefined,
  _baseAttackRoll = 10
): number {
  if (!weapon) {
    return 0;
  }

  const rule = new WeaponVsArmorRules();
  return rule.getWeaponVsArmorAdjustment(weapon, target.armorClass);
}
