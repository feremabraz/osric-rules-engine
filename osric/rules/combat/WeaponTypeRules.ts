import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';

export type WeaponType = 'Slashing' | 'Piercing' | 'Bludgeoning';

export class WeaponTypeRules extends BaseRule {
  name = 'weapon-type';

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const weapon = context.getTemporary(ContextKeys.COMBAT_ATTACK_WEAPON) as Weapon;

    if (!weapon) {
      return this.createFailureResult('No weapon found in context');
    }

    const weaponType = this.getWeaponType(weapon);
    const isVersatile = this.isVersatileWeapon(weapon);

    context.setTemporary(ContextKeys.COMBAT_WEAPON_TYPE, weaponType);
    context.setTemporary(ContextKeys.COMBAT_WEAPON_IS_VERSATILE, isVersatile);

    return this.createSuccessResult(
      `${weapon.name} is a ${weaponType.toLowerCase()} weapon${isVersatile ? ' (versatile damage type)' : ''}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.CHECK_WEAPON_TYPE)
      return false;

    const weapon = context.getTemporary(ContextKeys.COMBAT_ATTACK_WEAPON) as Weapon;
    return weapon !== null;
  }

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

  private readonly VERSATILE_WEAPONS: Record<string, WeaponType[]> = {
    Quarterstaff: ['Bludgeoning', 'Piercing'],
    Spear: ['Piercing', 'Slashing'],
    Halberd: ['Slashing', 'Piercing'],
    Poleaxe: ['Slashing', 'Bludgeoning'],
  };

  private getWeaponType(weapon: Weapon): WeaponType {
    return this.WEAPON_DAMAGE_TYPES[weapon.name] || 'Slashing';
  }

  private isVersatileWeapon(weapon: Weapon): boolean {
    return weapon.name in this.VERSATILE_WEAPONS;
  }
}
