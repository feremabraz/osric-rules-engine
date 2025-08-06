/**
 * InitiativeRules - OSRIC Initiative System Rules
 *
 * Migrated from rules/combat/initiative.ts
 * PRESERVATION: All OSRIC initiative mechanics and calculations preserved exactly
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  Spell,
  Weapon,
} from '../../types/entities';

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

export class InitiativeRollRule extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ROLL;
  readonly priority = 10; // Execute first in initiative chain

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      context.getTemporary('initiative-context') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;

    if (!initiativeContext) {
      return this.createFailureResult('No initiative context found');
    }

    try {
      const results: EntityInitiativeResult[] = [];

      if (initiativeContext.initiativeType === 'individual') {
        // Individual initiative - each entity rolls separately
        for (const entity of initiativeContext.entities) {
          const result = this.rollIndividualInitiative(entity, initiativeContext);
          results.push(result);
        }
      } else {
        // Group initiative - groups roll together
        const groupResults = this.rollGroupInitiative(initiativeContext);
        results.push(...groupResults);
      }

      // Sort by initiative (lower is better in OSRIC)
      results.sort((a, b) => {
        if (a.initiative !== b.initiative) {
          return a.initiative - b.initiative;
        }
        // Tie-breaker: weapon speed factor (lower is faster)
        return a.weaponSpeedFactor - b.weaponSpeedFactor;
      });

      // Store results for next rules
      context.setTemporary('initiative-results', results);

      const message = `Initiative rolled for ${results.length} entities`;
      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Initiative roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Roll individual initiative - PRESERVE OSRIC INDIVIDUAL MECHANICS
   */
  private rollIndividualInitiative(
    entity: CharacterData | MonsterData,
    context: InitiativeContext
  ): EntityInitiativeResult {
    // Base initiative roll is 1d10 (OSRIC standard)
    const naturalRoll = this.rollD10();

    // Calculate modifiers
    let modifiers = 0;

    // Apply dexterity reaction adjustment (characters only)
    if ('abilityModifiers' in entity && entity.abilityModifiers.dexterityReaction) {
      // In OSRIC, higher dexterity gives BETTER (lower) initiative
      modifiers -= entity.abilityModifiers.dexterityReaction;
    }

    // Apply circumstance modifiers
    if (context.circumstanceModifiers[entity.id]) {
      modifiers += context.circumstanceModifiers[entity.id];
    }

    // Get weapon speed factor
    const weapon = context.entityWeapons[entity.id];
    const spell = context.entitySpells[entity.id];
    let weaponSpeedFactor = 0;

    if (weapon) {
      weaponSpeedFactor = weapon.speed;
    } else if (spell) {
      // Spells have speed factor based on casting time
      weaponSpeedFactor = this.parseSpellCastingTime(spell.castingTime);
    }

    // Calculate final initiative (lower is better)
    const initiative = naturalRoll + modifiers + weaponSpeedFactor;

    return {
      entity,
      initiative,
      naturalRoll,
      modifiers,
      weaponSpeedFactor,
      surprised: false, // Will be set by surprise rule
    };
  }

  /**
   * Roll group initiative - PRESERVE OSRIC GROUP MECHANICS
   */
  private rollGroupInitiative(context: InitiativeContext): EntityInitiativeResult[] {
    // Group entities by type (characters vs monsters)
    const characters = context.entities.filter((e) => 'race' in e) as CharacterData[];
    const monsters = context.entities.filter((e) => 'species' in e) as MonsterData[];

    const results: EntityInitiativeResult[] = [];

    // Roll for character group
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

    // Roll for monster group
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

  /**
   * Roll initiative for a single group - PRESERVE OSRIC GROUP RULES
   */
  private rollSingleGroupInitiative(
    entities: (CharacterData | MonsterData)[],
    context: InitiativeContext
  ): {
    initiative: number;
    naturalRoll: number;
    modifiers: number;
    bestWeaponSpeed: number;
  } {
    // Roll 1d10 for the group
    const naturalRoll = this.rollD10();

    // Find the best (highest) dexterity reaction adjustment in the group
    let bestReactionAdj = 0;
    for (const entity of entities) {
      if ('abilityModifiers' in entity && entity.abilityModifiers.dexterityReaction) {
        const reactionAdj = entity.abilityModifiers.dexterityReaction;
        if (reactionAdj > bestReactionAdj) {
          bestReactionAdj = reactionAdj;
        }
      }
    }

    // Find the best (lowest) weapon speed factor in the group
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

    // If no weapons/spells found, use 0
    if (bestWeaponSpeed === Number.POSITIVE_INFINITY) {
      bestWeaponSpeed = 0;
    }

    // Apply best reaction adjustment to initiative (subtract for better init)
    const modifiers = -bestReactionAdj;
    const initiative = naturalRoll + modifiers + bestWeaponSpeed;

    return {
      initiative,
      naturalRoll,
      modifiers,
      bestWeaponSpeed,
    };
  }

  /**
   * Parse spell casting time to get speed factor
   */
  private parseSpellCastingTime(castingTime: string): number {
    // Extract number from casting time (e.g., "1 segment" -> 1)
    const match = castingTime.match(/(\d+)/);
    if (match) {
      const segments = Number.parseInt(match[1], 10);
      // Convert to initiative modifier (1 segment = 1 speed factor)
      return segments;
    }
    return 1; // Default if parsing fails
  }

  /**
   * Roll a d10 for initiative
   */
  private rollD10(): number {
    return Math.floor(Math.random() * 10) + 1;
  }
}

export class SurpriseCheckRule extends BaseRule {
  readonly name = RULE_NAMES.SURPRISE_CHECK;
  readonly priority = 20; // Execute after initiative roll

  canApply(context: GameContext, command: Command): boolean {
    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      initiativeContext !== null &&
      initiativeContext.isFirstRound
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const results = context.getTemporary('initiative-results') as EntityInitiativeResult[];

    if (!results) {
      return this.createFailureResult('No initiative results found for surprise check');
    }

    try {
      let surprisedCount = 0;

      // Check each entity for surprise
      for (const result of results) {
        const surprised = this.checkSurprise(result.entity);
        result.surprised = surprised;
        if (surprised) {
          surprisedCount++;
        }
      }

      // Update the results
      context.setTemporary('initiative-results', results);

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

  /**
   * Check if an entity is surprised - PRESERVE OSRIC SURPRISE MECHANICS
   */
  private checkSurprise(entity: CharacterData | MonsterData): boolean {
    // Base chance of surprise is 2 in 6 (1-2 on d6)
    const roll = this.rollD6();
    let surpriseThreshold = 2;

    // Racial modifiers - PRESERVE OSRIC RACIAL ABILITIES
    if ('race' in entity) {
      if (['Elf', 'Half-Elf'].includes(entity.race)) {
        surpriseThreshold -= 1; // Elves and Half-Elves are only surprised on a 1
      }
    }

    // Ensure threshold is between 0 and 6
    surpriseThreshold = Math.max(0, Math.min(6, surpriseThreshold));

    return roll <= surpriseThreshold;
  }

  /**
   * Roll a d6 for surprise
   */
  private rollD6(): number {
    return Math.floor(Math.random() * 6) + 1;
  }
}

export class InitiativeOrderRule extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ORDER;
  readonly priority = 30; // Execute last in initiative chain

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.INITIATIVE &&
      context.getTemporary('initiative-results') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const results = context.getTemporary('initiative-results') as EntityInitiativeResult[];

    if (!results) {
      return this.createFailureResult('No initiative results found for ordering');
    }

    try {
      // Filter out surprised entities for the first round
      const activeResults = results.filter((r) => !r.surprised);
      const surprisedResults = results.filter((r) => r.surprised);

      // Create the final initiative order
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

      // Store the final order
      context.setTemporary('initiative-order', finalOrder);

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
