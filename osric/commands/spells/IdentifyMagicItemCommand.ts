import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Item } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

/**
 * Command for identifying magic items in the OSRIC system.
 * Handles various identification methods and their requirements.
 *
 * Preserves OSRIC identification mechanics:
 * - Identify spell (1st level Magic-User spell)
 * - Sage consultation with chance of success
 * - Trial and error usage with risks
 * - Class restrictions and material component costs
 * - Time requirements for different methods
 * - Cursed item detection limitations
 */
export class IdentifyMagicItemCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.IDENTIFY_MAGIC_ITEM;

  constructor(
    identifierId: string,
    private itemId: string,
    private method: 'spell' | 'sage' | 'trial' = 'spell'
  ) {
    super(identifierId);
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Get the identifier
      const identifier = context.getEntity<Character>(this.actorId);
      if (!identifier) {
        return this.createFailureResult(`Identifier with ID ${this.actorId} not found.`);
      }

      // Get the item to identify
      const item = context.getItem(this.itemId);
      if (!item) {
        return this.createFailureResult(`Item with ID ${this.itemId} not found.`);
      }

      // Validate item is accessible to identifier
      if (!this.hasAccessToItem(identifier, item)) {
        return this.createFailureResult(`${identifier.name} does not have access to ${item.name}.`);
      }

      // Set up temporary data for rules to process
      context.setTemporary('identifyItem_identifier', identifier);
      context.setTemporary('identifyItem_item', item);
      context.setTemporary('identifyItem_method', this.method);

      // Store results for rule chain to populate
      context.setTemporary('identifyItem_result', null);

      return this.createSuccessResult(
        `${identifier.name} attempts to identify ${item.name} using ${this.method}`,
        {
          item: item.name,
          identifier: identifier.name,
          method: this.method,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Error identifying item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public canExecute(context: GameContext): boolean {
    // Validate entities exist
    if (!this.validateEntities(context)) {
      return false;
    }

    // Get the identifier
    const identifier = context.getEntity<Character>(this.actorId);
    if (!identifier) {
      return false;
    }

    // Get the item
    const item = context.getItem(this.itemId);
    if (!item) {
      return false;
    }

    // Must have access to the item
    if (!this.hasAccessToItem(identifier, item)) {
      return false;
    }

    // Check method-specific requirements
    return this.canUseMethod(identifier, this.method);
  }

  public getRequiredRules(): string[] {
    return ['IdentificationValidation', 'IdentificationMethod', 'IdentificationResults'];
  }

  /**
   * Check if identifier has access to the item
   */
  private hasAccessToItem(identifier: Character, item: Item): boolean {
    // Item must be in inventory or nearby (simplified to inventory for now)
    return identifier.inventory.some((invItem) => invItem.id === item.id);
  }

  /**
   * Check if character can use the specified identification method
   */
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

  /**
   * Check if character can use the Identify spell
   */
  private canUseIdentifySpell(identifier: Character): boolean {
    // Must be a Magic-User or have access to Magic-User spells
    if (!['Magic-User', 'Illusionist'].includes(identifier.class)) {
      return false;
    }

    // Must have Identify spell memorized or in spellbook
    return this.hasIdentifySpell(identifier);
  }

  /**
   * Check if character has the Identify spell available
   */
  private hasIdentifySpell(identifier: Character): boolean {
    // Check memorized spells
    const level1Spells = identifier.memorizedSpells[1] || [];
    const hasMemorized = level1Spells.some((spell) => spell.name.toLowerCase() === 'identify');

    if (hasMemorized) {
      return true;
    }

    // Check spellbook
    if (identifier.spellbook) {
      const hasInSpellbook = identifier.spellbook.some(
        (spell) => spell.name.toLowerCase() === 'identify' && spell.level === 1
      );
      return hasInSpellbook;
    }

    return false;
  }

  /**
   * Check if character can consult a sage
   */
  private canConsultSage(_identifier: Character): boolean {
    // In OSRIC, consulting a sage requires:
    // 1. Access to a sage (usually in a town or city)
    // 2. Payment for services
    // 3. Time (usually days or weeks)

    // For this implementation, we'll assume the sage is available
    // A full implementation would check location and availability
    return true;
  }

  /**
   * Check if character can use trial and error
   */
  private canUseTrialAndError(identifier: Character): boolean {
    // Trial and error is always available but risky
    // Character must be conscious and able to act
    return (
      identifier.hitPoints.current > 0 &&
      !identifier.statusEffects.some(
        (effect) => effect.name === 'Paralyzed' || effect.name === 'Unconscious'
      )
    );
  }

  /**
   * Get the base chance of successful identification by method
   * These preserve OSRIC identification mechanics
   */
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

  /**
   * Calculate chance for Identify spell
   * OSRIC: Identify spell reveals 1 property per 2 levels (minimum 1)
   */
  private getIdentifySpellChance(_identifier: Character, _item: Item): number {
    // Identify spell always succeeds, but reveals limited information
    // For simplicity, return 100% chance but with limited information
    return 100;
  }

  /**
   * Calculate chance for sage consultation
   * OSRIC: Varies by sage's expertise and item complexity
   */
  private getSageChance(identifier: Character, item: Item): number {
    // Base chance depends on item complexity and sage expertise
    let baseChance = 85; // Assume a competent sage

    // Adjust for item complexity (magic bonus as rough indicator)
    const magicBonus = item.magicBonus || 0;
    if (magicBonus > 2) {
      baseChance -= (magicBonus - 2) * 10;
    }

    // Adjust for character's charisma (better interaction with sage)
    const charismaBonus = this.getCharismaReactionAdjustment(identifier.abilities.charisma);
    baseChance += charismaBonus * 5;

    return Math.max(10, Math.min(95, baseChance));
  }

  /**
   * Calculate chance for trial and error
   * OSRIC: Very risky, low chance, may trigger cursed effects
   */
  private getTrialAndErrorChance(identifier: Character, _item: Item): number {
    // Trial and error has low base chance
    let baseChance = 25;

    // Thieves are better at trial and error
    if (identifier.class === 'Thief') {
      baseChance += 15;
    }

    // Intelligence helps
    const intelligenceBonus = this.getIntelligenceBonus(identifier.abilities.intelligence);
    baseChance += intelligenceBonus * 3;

    return Math.max(5, Math.min(60, baseChance));
  }

  /**
   * Get charisma reaction adjustment
   */
  private getCharismaReactionAdjustment(charisma: number): number {
    if (charisma <= 3) return -5;
    if (charisma <= 5) return -4;
    if (charisma <= 6) return -3;
    if (charisma <= 8) return -2;
    if (charisma <= 12) return -1;
    if (charisma <= 15) return 0;
    if (charisma <= 16) return 1;
    if (charisma <= 17) return 3;
    return 4; // Charisma 18+
  }

  /**
   * Get intelligence bonus for identification
   */
  private getIntelligenceBonus(intelligence: number): number {
    if (intelligence <= 7) return -2;
    if (intelligence <= 9) return -1;
    if (intelligence <= 12) return 0;
    if (intelligence <= 15) return 1;
    if (intelligence <= 17) return 2;
    return 3; // Intelligence 18+
  }

  /**
   * Get the time required for identification method
   */
  public getIdentificationTime(method: string): string {
    switch (method) {
      case 'spell':
        return '1 turn'; // Identify spell casting time
      case 'sage':
        return '1d4 days'; // Sage consultation time
      case 'trial':
        return '1d6 hours'; // Trial and error testing time
      default:
        return 'Unknown';
    }
  }

  /**
   * Get the cost for identification method
   */
  public getIdentificationCost(method: string, item: Item): number {
    switch (method) {
      case 'spell':
        return 100; // Cost of pearl component for Identify spell
      case 'sage': {
        // Sage cost varies by item value and complexity
        const baseValue = item.value || 100;
        return Math.max(50, Math.floor(baseValue * 0.1));
      }
      case 'trial':
        return 0; // Trial and error is free but risky
      default:
        return 0;
    }
  }
}
