import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';

import type { CharacterId, ItemId, MonsterId } from '@osric/types';
import { InitiativeValidator } from '@osric/types';
import type { Character as CharacterData } from '@osric/types/character';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { Spell } from '@osric/types/spell';

export interface InitiativeParameters {
  entities: Array<string | CharacterId | MonsterId>;
  initiativeType: 'individual' | 'group';
  weapons?: Record<string, string | ItemId>;
  spells?: Record<string, string>;
  circumstanceModifiers?: Record<string, number>;
  isFirstRound?: boolean;
}

export interface InitiativeResult {
  entityId: string;
  initiative: number;
  surprised: boolean;
  weaponSpeedFactor: number;
  naturalRoll: number;
  modifiers: number;
}

export class InitiativeCommand extends BaseCommand<InitiativeParameters> {
  readonly type = COMMAND_TYPES.INITIATIVE;
  readonly parameters: InitiativeParameters;

  constructor(parameters: InitiativeParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = InitiativeValidator.validate(
      this.parameters as unknown as Record<string, unknown>
    );
    if (!result.valid) {
      const errorMessages = result.errors.map((e) => String(e));
      throw new Error(`Parameter validation failed: ${errorMessages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const entities = this.getEntities(context);
      if (entities.length === 0) {
        return this.createFailureResult('No valid entities found for initiative');
      }

      const entityWeapons = this.getEntityWeapons(context, entities);
      const entitySpells = this.getEntitySpells(context, entities);

      const initiativeContext = {
        entities: entities.map((entity) => entity.id),
        initiativeType: this.parameters.initiativeType,
        weapons: entityWeapons,
        spells: entitySpells,
        circumstanceModifiers: this.parameters.circumstanceModifiers || {},
        isFirstRound: this.parameters.isFirstRound || false,
      };

      context.setTemporary('combat:initiative:context', initiativeContext);

      return this.createSuccessResult('Initiative command prepared for rule processing');
    } catch (error) {
      return this.createFailureResult(
        `Initiative command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const entities = this.getEntities(context);

    if (entities.length === 0) {
      return false;
    }

    for (const entity of entities) {
      if (entity.hitPoints.current <= 0) {
        return false;
      }

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
          entityWeapons[entity.id] = weaponId;
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
