import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult, isFailure } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import type { Spell } from '@osric/types/spell';

export interface ScrollCreation {
  creatorId: string;
  spellName: string;
  spellLevel: number;
  daysRequired: number;
  materialCost: number;
  progressPercentage: number;
}

export interface MagicScroll {
  id: string;
  name: string;
  itemType: 'scroll';
  spell: Spell;
  userClasses: string[];
  consumed: boolean;
  minCasterLevel: number;
  failureEffect?: string;
  weight: number;
  value: number;
  description: string;
  equipped: boolean;
  magicBonus: number | null;
  charges: number | null;
}

export interface ScrollCastingCheck {
  scroll: MagicScroll;
  caster: Character;
  failureChance: number;
  backfireChance: number;
}

export class ScrollCreationRequirementsRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_REQUIREMENTS;
  public readonly description =
    'Calculates requirements for creating magic scrolls using OSRIC formulas';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);
    return !!(characterId && spellLevel);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);

    if (!characterId || !spellLevel) {
      return this.createFailureResult('Missing character ID or spell level for scroll creation');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const isSpellcaster = ['Magic-User', 'Illusionist', 'Cleric', 'Druid'].includes(
      character.class
    );
    if (!isSpellcaster) {
      return this.createFailureResult('Only spellcasters can create scrolls');
    }

    const minimumCasterLevel = Math.max(1, spellLevel * 2 - 1);
    if (character.level < minimumCasterLevel) {
      return this.createFailureResult(
        `You must be at least level ${minimumCasterLevel} to create a level ${spellLevel} scroll`
      );
    }

    const baseDays = spellLevel * 2;
    const intelligenceModifier = character.abilityModifiers?.intelligenceLearnSpells || 0;
    const daysRequired = Math.max(1, baseDays - Math.floor(intelligenceModifier / 5));

    const goldCost = 100 * spellLevel ** 2;

    const message = `Creating a level ${spellLevel} scroll will require ${daysRequired} days and ${goldCost} gold pieces`;

    context.setTemporary(ContextKeys.SPELL_SCROLL_REQUIREMENTS, {
      kind: 'success' as const,
      daysRequired,
      goldCost,
      minimumCasterLevel,
    });

    return this.createSuccessResult(message, {
      kind: 'success',
      daysRequired,
      goldCost,
      minimumCasterLevel,
    });
  }
}

export class ScrollCreationStartRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_START;
  public readonly description = 'Starts a scroll creation project with OSRIC requirements';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellName = context.getTemporary<string>('spell:scroll:creation:spell-name');
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);
    return !!(characterId && spellName && spellLevel);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellName = context.getTemporary<string>('spell:scroll:creation:spell-name');
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);

    if (!characterId || !spellName || !spellLevel) {
      return this.createFailureResult('Missing parameters for scroll creation start');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER, characterId);
    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_LEVEL, spellLevel);

    const requirements = this.calculateRequirements(character, spellLevel);
    if (isFailure(requirements)) {
      return this.createFailureResult(requirements.message);
    }

    const scrollCreation: ScrollCreation = {
      creatorId: characterId,
      spellName,
      spellLevel,
      daysRequired: requirements.daysRequired,
      materialCost: requirements.goldCost,
      progressPercentage: 0,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_PROJECT, scrollCreation);

    const message = `Started creating scroll of ${spellName} (level ${spellLevel}). Progress: 0%`;

    return this.createSuccessResult(message, {
      creatorId: scrollCreation.creatorId,
      spellName: scrollCreation.spellName,
      spellLevel: scrollCreation.spellLevel,
      daysRequired: scrollCreation.daysRequired,
      materialCost: scrollCreation.materialCost,
      progressPercentage: scrollCreation.progressPercentage,
    });
  }

  private calculateRequirements(
    character: Character,
    spellLevel: number
  ): {
    kind: 'success' | 'failure';
    daysRequired: number;
    goldCost: number;
    message: string;
  } {
    const isSpellcaster = ['Magic-User', 'Illusionist', 'Cleric', 'Druid'].includes(
      character.class
    );
    if (!isSpellcaster) {
      return {
        kind: 'failure',
        daysRequired: 0,
        goldCost: 0,
        message: 'Only spellcasters can create scrolls',
      };
    }

    const minimumCasterLevel = Math.max(1, spellLevel * 2 - 1);
    if (character.level < minimumCasterLevel) {
      return {
        kind: 'failure',
        daysRequired: 0,
        goldCost: 0,
        message: `You must be at least level ${minimumCasterLevel} to create a level ${spellLevel} scroll`,
      };
    }

    const baseDays = spellLevel * 2;
    const intelligenceModifier = character.abilityModifiers?.intelligenceLearnSpells || 0;
    const daysRequired = Math.max(1, baseDays - Math.floor(intelligenceModifier / 5));
    const goldCost = 100 * spellLevel ** 2;

    return {
      kind: 'success',
      daysRequired,
      goldCost,
      message: `Creating a level ${spellLevel} scroll will require ${daysRequired} days and ${goldCost} gold`,
    };
  }
}

export class ScrollCreationProgressRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_PROGRESS;
  public readonly description = 'Updates progress on an ongoing scroll creation project';

  public canApply(context: GameContext): boolean {
    const project = context.getTemporary<ScrollCreation>(ContextKeys.SPELL_SCROLL_CREATION_PROJECT);
    const daysWorked = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_PROGRESS_DAYS_WORKED);
    return !!(project && daysWorked);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const project = context.getTemporary<ScrollCreation>(ContextKeys.SPELL_SCROLL_CREATION_PROJECT);
    const daysWorked = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_PROGRESS_DAYS_WORKED);

    if (!project || !daysWorked) {
      return this.createFailureResult('Missing project or days worked for progress update');
    }

    const progressGained = (daysWorked / project.daysRequired) * 100;
    const newProgress = Math.min(100, project.progressPercentage + progressGained);

    const updatedProject: ScrollCreation = {
      ...project,
      progressPercentage: newProgress,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_PROGRESS_RESULT, updatedProject);

    const message =
      newProgress >= 100
        ? `Scroll creation completed! ${project.spellName} scroll is ready.`
        : `Progress updated: ${Math.round(newProgress)}% complete (${Math.round(100 - newProgress)}% remaining)`;

    return this.createSuccessResult(message, {
      creatorId: updatedProject.creatorId,
      spellName: updatedProject.spellName,
      spellLevel: updatedProject.spellLevel,
      daysRequired: updatedProject.daysRequired,
      materialCost: updatedProject.materialCost,
      progressPercentage: updatedProject.progressPercentage,
    });
  }
}

export class ScrollUsageValidationRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_USAGE_VALIDATION;
  public readonly description = 'Validates if a character can use a specific scroll';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_CHARACTER);
    const scrollId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_SCROLL_ID);
    return !!(characterId && scrollId);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_CHARACTER);
    const scrollId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_SCROLL_ID);

    if (!characterId || !scrollId) {
      return this.createFailureResult('Missing character ID or scroll ID for usage validation');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const scroll = character.inventory.find((item: Item) => item.id === scrollId) as MagicScroll;
    if (!scroll || scroll.itemType !== 'scroll') {
      return this.createFailureResult('Scroll not found in character inventory');
    }

    const canUse = scroll.userClasses.includes(character.class);
    if (!canUse) {
      return this.createFailureResult(
        `${character.class} cannot use this scroll. Allowed classes: ${scroll.userClasses.join(', ')}`
      );
    }

    if (scroll.consumed) {
      return this.createFailureResult(
        'This scroll has already been used and is no longer functional'
      );
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_USAGE_VALIDATED, true);
    context.setTemporary(ContextKeys.SPELL_SCROLL_USAGE_SCROLL, scroll);

    const message = `${character.name} can use the scroll of ${scroll.spell.name}`;

    return this.createSuccessResult(message, {
      canUse: true,
      scroll,
      character,
    });
  }
}

export class ScrollCastingFailureRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CASTING_FAILURE;
  public readonly description =
    'Calculates failure chances for scroll casting using OSRIC formulas';

  public canApply(context: GameContext): boolean {
    const scroll = context.getTemporary<MagicScroll>(ContextKeys.SPELL_SCROLL_CASTING_SCROLL);
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_SCROLL_CASTING_CASTER);
    return !!(scroll && caster);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const scroll = context.getTemporary<MagicScroll>(ContextKeys.SPELL_SCROLL_CASTING_SCROLL);
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_SCROLL_CASTING_CASTER);

    if (!scroll || !caster) {
      return this.createFailureResult('Missing scroll or caster for failure calculation');
    }

    const levelDifference = Math.max(0, scroll.minCasterLevel - caster.level);

    const failureChance = Math.min(95, levelDifference * 5);

    const backfireChance = Math.min(50, failureChance / 2);

    const castingCheck: ScrollCastingCheck = {
      scroll,
      caster,
      failureChance,
      backfireChance,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_CASTING_CHECK, castingCheck);

    const message =
      levelDifference > 0
        ? `Scroll casting has ${failureChance}% failure chance (${backfireChance}% chance of backfire)`
        : 'Scroll can be cast without risk of failure';

    return this.createSuccessResult(message, {
      caster: castingCheck.caster.name,
      scroll: castingCheck.scroll.name,
      failureChance: castingCheck.failureChance,
      backfireChance: castingCheck.backfireChance,
    });
  }
}

export class ScrollSpellCastingRule extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_SPELL_CASTING;
  public readonly description =
    'Executes scroll spell casting with OSRIC success/failure mechanics';

  public canApply(context: GameContext): boolean {
    const castingCheck = context.getTemporary<ScrollCastingCheck>(
      ContextKeys.SPELL_SCROLL_CASTING_CHECK
    );
    return !!castingCheck;
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const castingCheck = context.getTemporary<ScrollCastingCheck>(
      ContextKeys.SPELL_SCROLL_CASTING_CHECK
    );

    if (!castingCheck) {
      return this.createFailureResult('Missing casting check for scroll spell casting');
    }

    const { scroll, caster, failureChance, backfireChance } = castingCheck;

    const failureRoll = Math.floor(Math.random() * 100) + 1;
    const success = failureRoll > failureChance;

    if (success) {
      const updatedScroll = { ...scroll, consumed: true };

      const updatedCharacter = {
        ...caster,
        inventory: caster.inventory.map((item) => (item.id === scroll.id ? updatedScroll : item)),
      };

      context.setEntity(caster.id, updatedCharacter);

      context.setTemporary(ContextKeys.SPELL_SCROLL_CAST_RESULT, {
        kind: 'success',
        backfired: false,
        spell: scroll.spell,
        scrollConsumed: true,
      });

      const message = `${caster.name} successfully casts ${scroll.spell.name} from the scroll`;

      return this.createSuccessResult(message, {
        kind: 'success',
        backfired: false,
        spell: scroll.spell,
        scrollConsumed: true,
      });
    }

    const backfireRoll = Math.floor(Math.random() * 100) + 1;
    const backfired = backfireRoll <= backfireChance;

    const updatedScroll = { ...scroll, consumed: true };
    const updatedCharacter = {
      ...caster,
      inventory: caster.inventory.map((item) => (item.id === scroll.id ? updatedScroll : item)),
    };

    context.setEntity(caster.id, updatedCharacter);

    let message: string;
    if (backfired) {
      const backfireMessage =
        scroll.failureEffect || 'The spell backfires with unpredictable results!';
      message = `${caster.name} fails to cast the scroll and ${backfireMessage}`;
    } else {
      message = `${caster.name} fails to cast ${scroll.spell.name} from the scroll, but nothing bad happens`;
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_CAST_RESULT, {
      kind: 'failure',
      backfired,
      spell: null,
      scrollConsumed: true,
    });

    return this.createSuccessResult(message, {
      kind: 'failure',
      backfired,
      spell: null,
      scrollConsumed: true,
    });
  }
}
