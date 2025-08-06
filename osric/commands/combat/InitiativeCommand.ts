/**
 * InitiativeCommand - OSRIC Initiative Resolution Command
 *
 * Implements the complete OSRIC initiative process including:
 * - Individual and group initiative rolls
 * - Dexterity reaction adjustments
 * - Weapon speed factor considerations
 * - Surprise round handling
 *
 * PRESERVATION: All OSRIC initiative mechanics and formulas are preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  Spell,
  Weapon,
} from '../../types/entities';

export interface InitiativeParameters {
  entities: string[]; // Array of Character or Monster IDs
  initiativeType: 'individual' | 'group'; // Individual or group initiative
  weapons?: Record<string, string>; // Entity ID -> Weapon ID mapping
  spells?: Record<string, string>; // Entity ID -> Spell name mapping
  circumstanceModifiers?: Record<string, number>; // Entity ID -> modifier
  isFirstRound?: boolean; // For surprise checking
}

export interface InitiativeResult {
  entityId: string;
  initiative: number;
  surprised: boolean;
  weaponSpeedFactor: number;
  naturalRoll: number;
  modifiers: number;
}

export class InitiativeCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.INITIATIVE;

  constructor(
    private parameters: InitiativeParameters,
    actorId = 'game-master' // Usually GM manages initiative
  ) {
    super(actorId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Validate all entities exist
      const entities = this.getEntities(context);
      if (entities.length === 0) {
        return this.createFailureResult('No valid entities found for initiative');
      }

      // Get weapons and spells for speed factors
      const entityWeapons = this.getEntityWeapons(context, entities);
      const entitySpells = this.getEntitySpells(context, entities);

      // Store initiative context for rules to process
      const initiativeContext = {
        entities: entities.map((entity) => entity.id), // Store entity IDs, not full objects
        initiativeType: this.parameters.initiativeType,
        weapons: entityWeapons,
        spells: entitySpells,
        circumstanceModifiers: this.parameters.circumstanceModifiers || {},
        isFirstRound: this.parameters.isFirstRound || false,
      };

      context.setTemporary('initiative-context', initiativeContext);

      // Rules will process:
      // 1. InitiativeRollRule - Calculate initiative scores
      // 2. SurpriseCheckRule - Check for surprise (if first round)
      // 3. InitiativeOrderRule - Determine final action order

      return this.createSuccessResult('Initiative command prepared for rule processing');
    } catch (error) {
      return this.createFailureResult(
        `Initiative command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const entities = this.getEntities(context);

    // Check that we have entities and none are unconscious
    if (entities.length === 0) {
      return false;
    }

    // Check if any entity is unconscious (0 or fewer hit points)
    for (const entity of entities) {
      if (entity.hitPoints.current <= 0) {
        return false;
      }

      // Also check for status effects that prevent action
      if (
        entity.statusEffects?.some(
          (effect) =>
            effect.name.toLowerCase().includes('unconscious') ||
            effect.name.toLowerCase().includes('paralyzed') ||
            effect.name.toLowerCase().includes('stunned')
        )
      ) {
        return false;
      }
    }

    return true;
  }

  getRequiredRules(): string[] {
    return ['initiative-roll', 'surprise-check', 'initiative-order'];
  }

  private getEntities(context: GameContext): (CharacterData | MonsterData)[] {
    const entities: (CharacterData | MonsterData)[] = [];

    for (const entityId of this.parameters.entities) {
      const entity = context.getEntity(entityId);
      if (entity && ('race' in entity || 'hitDice' in entity)) {
        entities.push(entity as CharacterData | MonsterData);
      }
    }

    return entities;
  }

  private getEntityWeapons(
    _context: GameContext,
    entities: (CharacterData | MonsterData)[]
  ): Record<string, string> {
    const entityWeapons: Record<string, string> = {};

    if (!this.parameters.weapons) {
      return entityWeapons;
    }

    for (const entity of entities) {
      const weaponId = this.parameters.weapons[entity.id];
      if (weaponId && 'inventory' in entity) {
        const weapon = entity.inventory.find((item) => item.id === weaponId && 'damage' in item);

        if (weapon) {
          entityWeapons[entity.id] = weaponId; // Store weapon ID, not weapon object
        }
      }
    }

    return entityWeapons;
  }

  private getEntitySpells(
    _context: GameContext,
    _entities: (CharacterData | MonsterData)[]
  ): Record<string, string> {
    const entitySpells: Record<string, string> = {};

    if (!this.parameters.spells) {
      return entitySpells;
    }

    for (const entityId of Object.keys(this.parameters.spells)) {
      const spellName = this.parameters.spells[entityId];
      if (spellName) {
        // Store the spell name - spell validation will be handled by spell casting rules
        entitySpells[entityId] = spellName;
      }
    }

    return entitySpells;
  }

  getCommandType(): string {
    return this.type;
  }

  getParameters(): InitiativeParameters {
    return { ...this.parameters };
  }

  getDescription(): string {
    const entityCount = this.parameters.entities.length;
    const type = this.parameters.initiativeType;
    const firstRound = this.parameters.isFirstRound ? ' (with surprise check)' : '';
    const typeInfo = type === 'individual' ? ' (individual)' : ' (group)';

    return `Initiative roll for ${entityCount} entities${typeInfo}${firstRound}`;
  }
}
