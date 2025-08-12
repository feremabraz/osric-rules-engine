import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { Spell } from '@osric/types/spell';

interface InitiativeContext {
  entities: (CharacterData | MonsterData)[];
  initiativeType: 'individual' | 'group';
  entityWeapons: Record<string, Weapon>;
  entitySpells: Record<string, Spell>;
  circumstanceModifiers: Record<string, number>;
  isFirstRound: boolean;
}

interface EntityInitiativeResult {
  entity: CharacterData | MonsterData;
  initiative: number;
  naturalRoll: number;
  modifiers: number;
  weaponSpeedFactor: number;
  surprised: boolean;
}

export class InitiativeRollRules extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ROLL;
  readonly priority = 10;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      context.getTemporary(ContextKeys.COMBAT_INITIATIVE_CONTEXT) !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const initiativeContext = context.getTemporary(
      ContextKeys.COMBAT_INITIATIVE_CONTEXT
    ) as InitiativeContext;

    if (!initiativeContext) {
      return this.createFailureResult('No initiative context found');
    }

    try {
      const results: EntityInitiativeResult[] = [];

      if (initiativeContext.initiativeType === 'individual') {
        for (const entity of initiativeContext.entities) {
          const result = this.rollIndividualInitiative(entity, initiativeContext);
          results.push(result);
        }
      } else {
        const groupResults = this.rollGroupInitiative(initiativeContext);
        results.push(...groupResults);
      }

      results.sort((a, b) => {
        if (a.initiative !== b.initiative) {
          return a.initiative - b.initiative;
        }

        return a.weaponSpeedFactor - b.weaponSpeedFactor;
      });

      context.setTemporary(ContextKeys.COMBAT_INITIATIVE_RESULTS, results);

      const message = `Initiative rolled for ${results.length} entities`;
      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Initiative roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private rollIndividualInitiative(
    entity: CharacterData | MonsterData,
    context: InitiativeContext
  ): EntityInitiativeResult {
    const naturalRoll = DiceEngine.roll('1d10').total;

    let modifiers = 0;

    if ('abilityModifiers' in entity && entity.abilityModifiers.dexterityReaction) {
      modifiers -= entity.abilityModifiers.dexterityReaction;
    }

    if (context.circumstanceModifiers[entity.id]) {
      modifiers += context.circumstanceModifiers[entity.id];
    }

    const weapon = context.entityWeapons[entity.id];
    const spell = context.entitySpells[entity.id];
    let weaponSpeedFactor = 0;

    if (weapon) {
      weaponSpeedFactor = weapon.speed;
    } else if (spell) {
      weaponSpeedFactor = this.parseSpellCastingTime(spell.castingTime);
    }

    const initiative = naturalRoll + modifiers + weaponSpeedFactor;

    return {
      entity,
      initiative,
      naturalRoll,
      modifiers,
      weaponSpeedFactor,
      surprised: false,
    };
  }

  private rollGroupInitiative(context: InitiativeContext): EntityInitiativeResult[] {
    const characters = context.entities.filter((e) => 'race' in e) as CharacterData[];
    const monsters = context.entities.filter((e) => 'species' in e) as MonsterData[];

    const results: EntityInitiativeResult[] = [];

    if (characters.length > 0) {
      const groupInit = this.rollSingleGroupInitiative(characters, context);
      for (const character of characters) {
        results.push({
          entity: character,
          initiative: groupInit.initiative,
          naturalRoll: groupInit.naturalRoll,
          modifiers: groupInit.modifiers,
          weaponSpeedFactor: groupInit.bestWeaponSpeed,
          surprised: false,
        });
      }
    }

    if (monsters.length > 0) {
      const groupInit = this.rollSingleGroupInitiative(monsters, context);
      for (const monster of monsters) {
        results.push({
          entity: monster,
          initiative: groupInit.initiative,
          naturalRoll: groupInit.naturalRoll,
          modifiers: groupInit.modifiers,
          weaponSpeedFactor: groupInit.bestWeaponSpeed,
          surprised: false,
        });
      }
    }

    return results;
  }

  private rollSingleGroupInitiative(
    entities: (CharacterData | MonsterData)[],
    context: InitiativeContext
  ): {
    initiative: number;
    naturalRoll: number;
    modifiers: number;
    bestWeaponSpeed: number;
  } {
    const naturalRoll = DiceEngine.roll('1d10').total;

    let bestReactionAdj = 0;
    for (const entity of entities) {
      if ('abilityModifiers' in entity && entity.abilityModifiers.dexterityReaction) {
        const reactionAdj = entity.abilityModifiers.dexterityReaction;
        if (reactionAdj > bestReactionAdj) {
          bestReactionAdj = reactionAdj;
        }
      }
    }

    let bestWeaponSpeed = Number.POSITIVE_INFINITY;
    for (const entity of entities) {
      const weapon = context.entityWeapons[entity.id];
      const spell = context.entitySpells[entity.id];

      let speed = 0;
      if (weapon) {
        speed = weapon.speed;
      } else if (spell) {
        speed = this.parseSpellCastingTime(spell.castingTime);
      }

      if (speed < bestWeaponSpeed) {
        bestWeaponSpeed = speed;
      }
    }

    if (bestWeaponSpeed === Number.POSITIVE_INFINITY) {
      bestWeaponSpeed = 0;
    }

    const modifiers = -bestReactionAdj;
    const initiative = naturalRoll + modifiers + bestWeaponSpeed;

    return {
      initiative,
      naturalRoll,
      modifiers,
      bestWeaponSpeed,
    };
  }

  private parseSpellCastingTime(castingTime: string): number {
    const match = castingTime.match(/(\d+)/);
    if (match) {
      const segments = Number.parseInt(match[1], 10);

      return segments;
    }
    return 1;
  }

  // d10 initiative now uses DiceEngine directly
}

export class SurpriseCheckRules extends BaseRule {
  readonly name = RULE_NAMES.SURPRISE_CHECK;
  readonly priority = 20;

  canApply(context: GameContext, command: Command): boolean {
    const initiativeContext = context.getTemporary(
      ContextKeys.COMBAT_INITIATIVE_CONTEXT
    ) as InitiativeContext;
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      initiativeContext !== null &&
      initiativeContext.isFirstRound
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const results = context.getTemporary(
      ContextKeys.COMBAT_INITIATIVE_RESULTS
    ) as EntityInitiativeResult[];

    if (!results) {
      return this.createFailureResult('No initiative results found for surprise check');
    }

    try {
      let surprisedCount = 0;

      for (const result of results) {
        const surprised = this.checkSurprise(result.entity);
        result.surprised = surprised;
        if (surprised) {
          surprisedCount++;
        }
      }

      context.setTemporary(ContextKeys.COMBAT_INITIATIVE_RESULTS, results);

      const message =
        surprisedCount > 0
          ? `${surprisedCount} entities surprised and lose first round`
          : 'No entities surprised';

      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Surprise check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private checkSurprise(entity: CharacterData | MonsterData): boolean {
    const roll = DiceEngine.roll('1d6').total;
    let surpriseThreshold = 2;

    if ('race' in entity) {
      if (['Elf', 'Half-Elf'].includes(entity.race)) {
        surpriseThreshold -= 1;
      }
    }

    surpriseThreshold = Math.max(0, Math.min(6, surpriseThreshold));

    return roll <= surpriseThreshold;
  }

  // d6 surprise now uses DiceEngine directly
}

export class InitiativeOrderRules extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ORDER;
  readonly priority = 30;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      context.getTemporary(ContextKeys.COMBAT_INITIATIVE_RESULTS) !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const results = context.getTemporary(
      ContextKeys.COMBAT_INITIATIVE_RESULTS
    ) as EntityInitiativeResult[];

    if (!results) {
      return this.createFailureResult('No initiative results found for ordering');
    }

    try {
      const activeResults = results.filter((r) => !r.surprised);
      const surprisedResults = results.filter((r) => r.surprised);

      const finalOrder = {
        activeEntities: activeResults.map((r) => ({
          entityId: r.entity.id,
          name: r.entity.name,
          initiative: r.initiative,
          weaponSpeedFactor: r.weaponSpeedFactor,
        })),
        surprisedEntities: surprisedResults.map((r) => ({
          entityId: r.entity.id,
          name: r.entity.name,
          initiative: r.initiative,
        })),
        roundNumber: 1,
      };

      context.setTemporary('combat:initiative:order', finalOrder);

      const activeCount = activeResults.length;
      const surprisedCount = surprisedResults.length;

      let message = `Initiative order established: ${activeCount} entities act`;
      if (surprisedCount > 0) {
        message += `, ${surprisedCount} surprised`;
      }

      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Initiative ordering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
