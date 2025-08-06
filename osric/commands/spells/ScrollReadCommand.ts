import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Item } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

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
      const reader = context.getEntity<Character>(this.actorId);
      if (!reader) {
        return this.createFailureResult(`Reader with ID ${this.actorId} not found.`);
      }

      const scroll = context.getItem(this.scrollId);
      if (!scroll) {
        return this.createFailureResult(`Scroll with ID ${this.scrollId} not found.`);
      }

      if (!this.hasScroll(reader, scroll)) {
        return this.createFailureResult(`${reader.name} does not have the scroll ${scroll.name}.`);
      }

      context.setTemporary('readScroll_reader', reader);
      context.setTemporary('readScroll_scroll', scroll);
      context.setTemporary('readScroll_targets', this.getTargets(context));

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
    if (!this.validateEntities(context)) {
      return false;
    }

    const reader = context.getEntity<Character>(this.actorId);
    if (!reader) {
      return false;
    }

    const scroll = context.getItem(this.scrollId);
    if (!scroll) {
      return false;
    }

    if (!this.hasScroll(reader, scroll)) {
      return false;
    }

    return this.canRead(reader);
  }

  public getRequiredRules(): string[] {
    return ['ScrollValidation', 'ScrollReadingChance', 'ScrollSpellCasting', 'ScrollDestruction'];
  }

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

  private hasScroll(reader: Character, scroll: Item): boolean {
    return reader.inventory.some((item) => item.id === scroll.id);
  }

  private canRead(reader: Character): boolean {
    if (reader.hitPoints.current <= 0) {
      return false;
    }

    const preventingConditions = ['Blinded', 'Unconscious', 'Paralyzed'];
    const hasPreventingCondition = reader.statusEffects.some((effect) =>
      preventingConditions.includes(effect.name)
    );

    return !hasPreventingCondition;
  }

  public getScrollType(scroll: Item): 'spell' | 'protection' | 'cursed' | 'unknown' {
    const scrollName = scroll.name.toLowerCase();

    if (scrollName.includes('protection')) {
      return 'protection';
    }

    if (scrollName.includes('cursed') || scrollName.includes('curse')) {
      return 'cursed';
    }

    if (scrollName.includes('scroll') && !scrollName.includes('protection')) {
      return 'spell';
    }

    return 'unknown';
  }

  public getScrollSpellInfo(
    scroll: Item
  ): { spellName: string; spellLevel: number; casterLevel: number } | null {
    const scrollName = scroll.name;

    const spellMatch = scrollName.match(/Scroll of (.+?)(?:\s*\((\d+)(?:st|nd|rd|th)\s*level\))?/i);

    if (spellMatch) {
      const spellName = spellMatch[1].trim();
      const spellLevel = spellMatch[2] ? Number.parseInt(spellMatch[2], 10) : 1;

      const casterLevel = this.getMinimumCasterLevel(spellLevel);

      return {
        spellName,
        spellLevel,
        casterLevel,
      };
    }

    return null;
  }

  private getMinimumCasterLevel(spellLevel: number): number {
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
