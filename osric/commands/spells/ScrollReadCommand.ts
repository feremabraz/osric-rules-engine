import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Item } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

/**
 * Command for reading magical scrolls in the OSRIC system.
 * Handles scroll identification, class restrictions, and casting mechanics.
 *
 * Preserves OSRIC scroll mechanics:
 * - Class restrictions for spell scrolls
 * - Chance of failure for non-thieves reading scrolls
 * - Spell level limitations based on caster level
 * - Scroll destruction after use
 * - Protection scrolls usable by all classes
 * - Cursed scroll mechanics
 */
export class ScrollReadCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.READ_SCROLL;

  constructor(
    readerId: string,
    private scrollId: string,
    targetIds: string[] = []
  ) {
    super(readerId, targetIds);
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Get the reader
      const reader = context.getEntity<Character>(this.actorId);
      if (!reader) {
        return this.createFailureResult(`Reader with ID ${this.actorId} not found.`);
      }

      // Get the scroll
      const scroll = context.getItem(this.scrollId);
      if (!scroll) {
        return this.createFailureResult(`Scroll with ID ${this.scrollId} not found.`);
      }

      // Validate scroll is in reader's inventory
      if (!this.hasScroll(reader, scroll)) {
        return this.createFailureResult(`${reader.name} does not have the scroll ${scroll.name}.`);
      }

      // Set up temporary data for rules to process
      context.setTemporary('readScroll_reader', reader);
      context.setTemporary('readScroll_scroll', scroll);
      context.setTemporary('readScroll_targets', this.getTargets(context));

      // Store results for rule chain to populate
      context.setTemporary('readScroll_result', null);

      return this.createSuccessResult(`${reader.name} attempts to read ${scroll.name}`, {
        scroll: scroll.name,
        reader: reader.name,
        targets: this.targetIds,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error reading scroll: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public canExecute(context: GameContext): boolean {
    // Validate entities exist
    if (!this.validateEntities(context)) {
      return false;
    }

    // Get the reader
    const reader = context.getEntity<Character>(this.actorId);
    if (!reader) {
      return false;
    }

    // Get the scroll
    const scroll = context.getItem(this.scrollId);
    if (!scroll) {
      return false;
    }

    // Must have the scroll in inventory
    if (!this.hasScroll(reader, scroll)) {
      return false;
    }

    // Must be able to read (not blinded, unconscious, etc.)
    return this.canRead(reader);
  }

  public getRequiredRules(): string[] {
    return ['ScrollValidation', 'ScrollReadingChance', 'ScrollSpellCasting', 'ScrollDestruction'];
  }

  /**
   * Get target entities for the scroll
   */
  private getTargets(context: GameContext): Character[] {
    const targets: Character[] = [];

    for (const targetId of this.targetIds) {
      const target = context.getEntity<Character>(targetId);
      if (target) {
        targets.push(target);
      }
    }

    return targets;
  }

  /**
   * Check if reader has the scroll in their inventory
   */
  private hasScroll(reader: Character, scroll: Item): boolean {
    return reader.inventory.some((item) => item.id === scroll.id);
  }

  /**
   * Check if character can read (not blinded, unconscious, etc.)
   */
  private canRead(reader: Character): boolean {
    // Check if conscious
    if (reader.hitPoints.current <= 0) {
      return false;
    }

    // Check for conditions that prevent reading
    const preventingConditions = ['Blinded', 'Unconscious', 'Paralyzed'];
    const hasPreventingCondition = reader.statusEffects.some((effect) =>
      preventingConditions.includes(effect.name)
    );

    return !hasPreventingCondition;
  }

  /**
   * Get scroll type for validation
   */
  public getScrollType(scroll: Item): 'spell' | 'protection' | 'cursed' | 'unknown' {
    const scrollName = scroll.name.toLowerCase();

    // Protection scrolls
    if (scrollName.includes('protection')) {
      return 'protection';
    }

    // Cursed scrolls
    if (scrollName.includes('cursed') || scrollName.includes('curse')) {
      return 'cursed';
    }

    // Spell scrolls
    if (scrollName.includes('scroll') && !scrollName.includes('protection')) {
      return 'spell';
    }

    return 'unknown';
  }

  /**
   * Extract spell information from scroll name
   * This is a simplified implementation - in practice would use a scroll database
   */
  public getScrollSpellInfo(
    scroll: Item
  ): { spellName: string; spellLevel: number; casterLevel: number } | null {
    // Parse scroll name to extract spell information
    // Format examples: "Scroll of Magic Missile (1st level)", "Scroll of Fireball (3rd level)"
    const scrollName = scroll.name;

    // Basic parsing - in full implementation would use comprehensive scroll database
    const spellMatch = scrollName.match(/Scroll of (.+?)(?:\s*\((\d+)(?:st|nd|rd|th)\s*level\))?/i);

    if (spellMatch) {
      const spellName = spellMatch[1].trim();
      const spellLevel = spellMatch[2] ? Number.parseInt(spellMatch[2], 10) : 1;

      // Calculate minimum caster level needed to cast this spell
      const casterLevel = this.getMinimumCasterLevel(spellLevel);

      return {
        spellName,
        spellLevel,
        casterLevel,
      };
    }

    return null;
  }

  /**
   * Get minimum caster level needed to cast a spell of the given level
   * Preserves OSRIC spell level requirements
   */
  private getMinimumCasterLevel(spellLevel: number): number {
    // OSRIC minimum caster levels for spell levels
    const minimumLevels: Record<number, number> = {
      1: 1,
      2: 3,
      3: 5,
      4: 7,
      5: 9,
      6: 11,
      7: 13,
      8: 15,
      9: 17,
    };

    return minimumLevels[spellLevel] || 1;
  }
}
