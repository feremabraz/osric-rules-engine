import type { Character, Item } from '@osric/types';
import { IdentifyMagicItemValidator } from '@osric/types';
import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';

import type { CharacterId, ItemId } from '@osric/types';

export interface IdentifyMagicItemParameters {
  identifierId: string | CharacterId;
  itemId: string | ItemId;
  method: 'spell' | 'sage' | 'trial';
}

export class IdentifyMagicItemCommand extends BaseCommand<IdentifyMagicItemParameters> {
  public readonly type = COMMAND_TYPES.IDENTIFY_MAGIC_ITEM;
  readonly parameters: IdentifyMagicItemParameters;

  constructor(
    parameters: IdentifyMagicItemParameters,
    actorId: EntityId,
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = IdentifyMagicItemValidator.validate(
      this.parameters as unknown as Record<string, unknown>
    );
    if (!result.valid) {
      const errorMessages = result.errors.map((e) => String(e));
      throw new Error(`Parameter validation failed: ${errorMessages.join(', ')}`);
    }
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      const identifier = context.getEntity<Character>(this.actorId);
      if (!identifier) {
        return this.createFailureResult(`Identifier with ID ${this.actorId} not found.`);
      }

      const item = context.getItem(this.parameters.itemId);
      if (!item) {
        return this.createFailureResult(`Item with ID ${this.parameters.itemId} not found.`);
      }

      if (!this.hasAccessToItem(identifier, item)) {
        return this.createFailureResult(`${identifier.name} does not have access to ${item.name}.`);
      }

      context.setTemporary('identifyItem_identifier', identifier);
      context.setTemporary('identifyItem_item', item);
      context.setTemporary('identifyItem_method', this.parameters.method);

      context.setTemporary('identifyItem_result', null);

      return this.createSuccessResult(
        `${identifier.name} attempts to identify ${item.name} using ${this.parameters.method}`,
        {
          item: item.name,
          identifier: identifier.name,
          method: this.parameters.method,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Error identifying item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public canExecute(context: GameContext): boolean {
    if (!this.validateEntitiesExist(context)) {
      return false;
    }

    const identifier = context.getEntity<Character>(this.actorId);
    if (!identifier) {
      return false;
    }

    const item = context.getItem(this.parameters.itemId);
    if (!item) {
      return false;
    }

    if (!this.hasAccessToItem(identifier, item)) {
      return false;
    }

    return this.canUseMethod(identifier, this.parameters.method);
  }

  public getRequiredRules(): string[] {
    return ['IdentificationValidation', 'IdentificationMethod', 'IdentificationResults'];
  }

  private hasAccessToItem(identifier: Character, item: Item): boolean {
    return identifier.inventory.some((invItem) => invItem.id === item.id);
  }

  private canUseMethod(identifier: Character, method: string): boolean {
    switch (method) {
      case 'spell':
        return this.canUseIdentifySpell(identifier);
      case 'sage':
        return this.canConsultSage(identifier);
      case 'trial':
        return this.canUseTrialAndError(identifier);
      default:
        return false;
    }
  }

  private canUseIdentifySpell(identifier: Character): boolean {
    if (!['Magic-User', 'Illusionist'].includes(identifier.class)) {
      return false;
    }

    return this.hasIdentifySpell(identifier);
  }

  private hasIdentifySpell(identifier: Character): boolean {
    const level1Spells = identifier.memorizedSpells[1] || [];
    const hasMemorized = level1Spells.some((spell) => spell.name.toLowerCase() === 'identify');

    if (hasMemorized) {
      return true;
    }

    if (identifier.spellbook) {
      const hasInSpellbook = identifier.spellbook.some(
        (spell) => spell.name.toLowerCase() === 'identify' && spell.level === 1
      );
      return hasInSpellbook;
    }

    return false;
  }

  private canConsultSage(_identifier: Character): boolean {
    return true;
  }

  private canUseTrialAndError(identifier: Character): boolean {
    return (
      identifier.hitPoints.current > 0 &&
      !identifier.statusEffects.some(
        (effect) => effect.name === 'Paralyzed' || effect.name === 'Unconscious'
      )
    );
  }

  public getIdentificationChance(identifier: Character, method: string, item: Item): number {
    switch (method) {
      case 'spell':
        return this.getIdentifySpellChance(identifier, item);
      case 'sage':
        return this.getSageChance(identifier, item);
      case 'trial':
        return this.getTrialAndErrorChance(identifier, item);
      default:
        return 0;
    }
  }

  private getIdentifySpellChance(_identifier: Character, _item: Item): number {
    return 100;
  }

  private getSageChance(identifier: Character, item: Item): number {
    let baseChance = 85;

    const magicBonus = item.magicBonus || 0;
    if (magicBonus > 2) {
      baseChance -= (magicBonus - 2) * 10;
    }

    const charismaBonus = this.getCharismaReactionAdjustment(identifier.abilities.charisma);
    baseChance += charismaBonus * 5;

    return Math.max(10, Math.min(95, baseChance));
  }

  private getTrialAndErrorChance(identifier: Character, _item: Item): number {
    let baseChance = 25;

    if (identifier.class === 'Thief') {
      baseChance += 15;
    }

    const intelligenceBonus = this.getIntelligenceBonus(identifier.abilities.intelligence);
    baseChance += intelligenceBonus * 3;

    return Math.max(5, Math.min(60, baseChance));
  }

  private getCharismaReactionAdjustment(charisma: number): number {
    if (charisma <= 3) return -5;
    if (charisma <= 5) return -4;
    if (charisma <= 6) return -3;
    if (charisma <= 8) return -2;
    if (charisma <= 12) return -1;
    if (charisma <= 15) return 0;
    if (charisma <= 16) return 1;
    if (charisma <= 17) return 3;
    return 4;
  }

  private getIntelligenceBonus(intelligence: number): number {
    if (intelligence <= 7) return -2;
    if (intelligence <= 9) return -1;
    if (intelligence <= 12) return 0;
    if (intelligence <= 15) return 1;
    if (intelligence <= 17) return 2;
    return 3;
  }

  public getIdentificationTime(method: string): string {
    switch (method) {
      case 'spell':
        return '1 turn';
      case 'sage':
        return '1d4 days';
      case 'trial':
        return '1d6 hours';
      default:
        return 'Unknown';
    }
  }

  public getIdentificationCost(method: string, item: Item): number {
    switch (method) {
      case 'spell':
        return 100;
      case 'sage': {
        const baseValue = item.value || 100;
        return Math.max(50, Math.floor(baseValue * 0.1));
      }
      case 'trial':
        return 0;
      default:
        return 0;
    }
  }
}
