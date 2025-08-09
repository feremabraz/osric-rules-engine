import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  CombatResult,
  Monster as MonsterData,
  Weapon,
} from '@osric/types/entities';

interface TwoWeaponContext {
  attacker: CharacterData;
  target: CharacterData | MonsterData;
  mainHandWeapon: Weapon;
  offHandWeapon: Weapon;
  situationalModifiers?: number;
}

export class TwoWeaponFightingRule extends BaseRule {
  name = 'two-weapon-fighting';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const twoWeaponContext = context.getTemporary('combat:two-weapon:context') as TwoWeaponContext;

    if (!twoWeaponContext) {
      return this.createFailureResult('No two-weapon fighting context found');
    }

    const {
      attacker,
      target,
      mainHandWeapon,
      offHandWeapon,
      situationalModifiers = 0,
    } = twoWeaponContext;

    if (!this.canBeUsedOffhand(offHandWeapon)) {
      return this.createFailureResult(
        `${offHandWeapon.name} cannot be used as an off-hand weapon. Only daggers and hand axes are allowed.`
      );
    }

    const penalties = this.getTwoWeaponPenalties(attacker);

    const results = this.resolveTwoWeaponAttack(
      attacker,
      target,
      mainHandWeapon,
      offHandWeapon,
      situationalModifiers,
      penalties
    );

    context.setTemporary('two-weapon-results', results);
    context.setTemporary('main-hand-result', results.mainHandResult);
    context.setTemporary('off-hand-result', results.offHandResult);

    return this.createSuccessResult(
      `Two-weapon attack resolved: Main hand ${results.mainHandResult.hit ? 'hit' : 'missed'}, ` +
        `Off hand ${results.offHandResult.hit ? 'hit' : 'missed'}`,
      undefined,
      undefined,
      undefined,
      true
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const twoWeaponContext = context.getTemporary('combat:two-weapon:context') as TwoWeaponContext;
    return twoWeaponContext !== null;
  }

  private canBeUsedOffhand(weapon: Weapon): boolean {
    return ['Dagger', 'Hand Axe'].includes(weapon.name);
  }

  private getTwoWeaponPenalties(character: CharacterData): {
    mainHandPenalty: number;
    offHandPenalty: number;
  } {
    let mainHandPenalty = -2;
    let offHandPenalty = -4;

    if (character.abilityModifiers?.dexterityMissile) {
      mainHandPenalty += character.abilityModifiers.dexterityMissile;
      offHandPenalty += character.abilityModifiers.dexterityMissile;
    }

    mainHandPenalty = Math.min(0, mainHandPenalty);
    offHandPenalty = Math.min(0, offHandPenalty);

    return {
      mainHandPenalty,
      offHandPenalty,
    };
  }

  private resolveTwoWeaponAttack(
    attacker: CharacterData,
    target: CharacterData | MonsterData,
    mainHandWeapon: Weapon,
    offHandWeapon: Weapon,
    situationalModifiers: number,
    penalties: { mainHandPenalty: number; offHandPenalty: number }
  ): {
    mainHandResult: CombatResult;
    offHandResult: CombatResult;
  } {
    const mainHandResult = this.executeAttack(
      attacker,
      target,
      mainHandWeapon,
      situationalModifiers + penalties.mainHandPenalty
    );

    mainHandResult.message = `Main hand (${mainHandWeapon.name}): ${mainHandResult.message}`;

    if (target.hitPoints.current <= 0) {
      return {
        mainHandResult,
        offHandResult: {
          hit: false,
          damage: [],
          critical: false,
          message: 'Off hand attack not needed as target was defeated by main hand attack.',
          specialEffects: null,
        },
      };
    }

    const offHandResult = this.executeAttack(
      attacker,
      target,
      offHandWeapon,
      situationalModifiers + penalties.offHandPenalty
    );

    offHandResult.message = `Off hand (${offHandWeapon.name}): ${offHandResult.message}`;

    return {
      mainHandResult,
      offHandResult,
    };
  }

  private executeAttack(
    attacker: CharacterData,
    target: CharacterData | MonsterData,
    weapon: Weapon,
    modifier: number
  ): CombatResult {
    return {
      hit: true,
      damage: [1],
      critical: false,
      message: `${attacker.name} attacks ${target.name} with ${weapon.name} (modifier: ${modifier})`,
      specialEffects: null,
    };
  }
}

export class TwoWeaponEligibilityRule extends BaseRule {
  name = 'two-weapon-eligibility';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const character = context.getTemporary('character:creation:data') as CharacterData;
    const mainHandWeapon = context.getTemporary('main-hand-weapon') as Weapon;
    const offHandWeapon = context.getTemporary('off-hand-weapon') as Weapon;

    if (!character || !mainHandWeapon || !offHandWeapon) {
      return this.createFailureResult('Character or weapons not found in context');
    }

    const eligibility = this.checkTwoWeaponEligibility(character, mainHandWeapon, offHandWeapon);
    context.setTemporary('two-weapon-eligibility', eligibility);

    return this.createSuccessResult(
      eligibility.canUseTwoWeapons
        ? 'Two-weapon fighting is allowed'
        : `Two-weapon fighting not allowed: ${eligibility.reason}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CHECK_TWO_WEAPON) return false;

    const character = context.getTemporary('character:creation:data') as CharacterData;
    const mainHandWeapon = context.getTemporary('main-hand-weapon') as Weapon;
    const offHandWeapon = context.getTemporary('off-hand-weapon') as Weapon;

    return character !== null && mainHandWeapon !== null && offHandWeapon !== null;
  }

  private checkTwoWeaponEligibility(
    character: CharacterData,
    mainHandWeapon: Weapon,
    offHandWeapon: Weapon
  ): {
    canUseTwoWeapons: boolean;
    reason?: string;
    penalties?: { mainHandPenalty: number; offHandPenalty: number };
  } {
    if (mainHandWeapon.twoHanded) {
      return {
        canUseTwoWeapons: false,
        reason: 'Main hand weapon is two-handed',
      };
    }

    if (!this.canBeUsedOffhand(offHandWeapon)) {
      return {
        canUseTwoWeapons: false,
        reason: 'Off-hand weapon must be a dagger or hand axe',
      };
    }

    const penalties = this.getTwoWeaponPenalties(character);

    return {
      canUseTwoWeapons: true,
      penalties,
    };
  }

  private canBeUsedOffhand(weapon: Weapon): boolean {
    return ['Dagger', 'Hand Axe'].includes(weapon.name);
  }

  private getTwoWeaponPenalties(character: CharacterData): {
    mainHandPenalty: number;
    offHandPenalty: number;
  } {
    let mainHandPenalty = -2;
    let offHandPenalty = -4;

    if (character.abilityModifiers?.dexterityMissile) {
      mainHandPenalty += character.abilityModifiers.dexterityMissile;
      offHandPenalty += character.abilityModifiers.dexterityMissile;
    }

    mainHandPenalty = Math.min(0, mainHandPenalty);
    offHandPenalty = Math.min(0, offHandPenalty);

    return {
      mainHandPenalty,
      offHandPenalty,
    };
  }
}
