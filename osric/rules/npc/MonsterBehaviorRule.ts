/**
 * Monster Behavior Rules for OSRIC
 * Handles monster AI, reactions, and behavioral patterns during encounters
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';

import { DiceEngine } from '../../core/Dice';
import type { Monster } from '../../entities/Monster';

interface MonsterBehaviorContext {
  monster: Monster;
  situation: 'encounter' | 'combat' | 'surprised' | 'victory' | 'defeat';
  partySize: number;
  partyLevel: number;
  environmentFactor?: 'lair' | 'territory' | 'neutral' | 'foreign';
  previousInteraction?: 'hostile' | 'neutral' | 'friendly';
}

interface BehaviorPattern {
  action: 'attack' | 'flee' | 'negotiate' | 'parley' | 'retreat' | 'pursue' | 'guard' | 'patrol';
  confidence: number; // 1-100
  aggression: number; // 1-100
  tactics: string[];
  priority: number;
}

interface MonsterBehaviorResult {
  primaryBehavior: BehaviorPattern;
  alternativeBehaviors: BehaviorPattern[];
  reaction: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'helpful';
  morale: number; // 2-12 typically
  tactics: string[];
  specialActions: string[];
}

export class MonsterBehaviorRule extends BaseRule {
  readonly name = 'monster-behavior';
  readonly priority = 100; // Standard priority for behavior determination

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      // Get monster behavior context
      const behaviorContext = this.getRequiredContext<MonsterBehaviorContext>(
        context,
        'npc:monster-behavior:context'
      );

      // Determine monster behavior based on various factors
      const behaviorResult = this.determineBehavior(behaviorContext);

      // Store behavior results
      this.setContext(context, 'npc:monster-behavior:result', behaviorResult);

      const behaviorSummary = this.createBehaviorSummary(behaviorResult, behaviorContext.monster);

      return this.createSuccessResult(`Determined behavior for ${behaviorContext.monster.name}`, {
        behavior: behaviorResult,
        monster: behaviorContext.monster.name,
        situation: behaviorContext.situation,
        summary: behaviorSummary,
        effects: [behaviorSummary],
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to determine monster behavior: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    // Applies to monster generation and encounter commands
    if (!['monster-generation', 'encounter-reaction'].includes(command.type)) {
      return false;
    }

    // Must have monster behavior context
    const behaviorContext = this.getOptionalContext<MonsterBehaviorContext>(
      context,
      'npc:monster-behavior:context'
    );

    return behaviorContext !== null;
  }

  getPrerequisites(): string[] {
    return ['monster-stats']; // Monster must be generated first
  }

  /**
   * Determine monster behavior based on context
   */
  private determineBehavior(context: MonsterBehaviorContext): MonsterBehaviorResult {
    const monster = context.monster;

    // Base reaction roll (2d6, modified by charisma and circumstances)
    const reactionRoll = this.rollReaction(context);
    const reaction = this.interpretReaction(reactionRoll);

    // Determine morale (typically 2d6, but varies by monster)
    const morale = this.calculateMorale(monster, context);

    // Primary behavior based on intelligence, situation, and reaction
    const primaryBehavior = this.determinePrimaryBehavior(monster, context, reaction);

    // Alternative behaviors for tactical flexibility
    const alternativeBehaviors = this.determineAlternativeBehaviors(monster, context, reaction);

    // Tactical considerations
    const tactics = this.determineTactics(monster, context);

    // Special actions based on monster abilities
    const specialActions = this.determineSpecialActions(monster, context);

    return {
      primaryBehavior,
      alternativeBehaviors,
      reaction,
      morale,
      tactics,
      specialActions,
    };
  }

  /**
   * Roll for initial reaction
   */
  private rollReaction(context: MonsterBehaviorContext): number {
    const baseRoll = DiceEngine.roll('2d6').total;

    let modifiers = 0;

    // Environmental modifiers
    if (context.environmentFactor === 'lair') {
      modifiers += 2; // More aggressive in lair
    } else if (context.environmentFactor === 'foreign') {
      modifiers -= 1; // More cautious in unfamiliar territory
    }

    // Party size modifiers
    if (context.partySize >= 6) {
      modifiers -= 1; // Large parties are threatening
    } else if (context.partySize <= 2) {
      modifiers += 1; // Small parties are less threatening
    }

    // Previous interaction modifiers
    if (context.previousInteraction === 'hostile') {
      modifiers -= 2;
    } else if (context.previousInteraction === 'friendly') {
      modifiers += 2;
    }

    return Math.max(2, Math.min(12, baseRoll + modifiers));
  }

  /**
   * Interpret reaction roll result
   */
  private interpretReaction(
    roll: number
  ): 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'helpful' {
    if (roll <= 2) return 'hostile';
    if (roll <= 5) return 'unfriendly';
    if (roll <= 8) return 'neutral';
    if (roll <= 11) return 'friendly';
    return 'helpful';
  }

  /**
   * Calculate monster morale
   */
  private calculateMorale(monster: Monster, context: MonsterBehaviorContext): number {
    let baseMorale = monster.morale || 8; // Default morale if not specified

    // Situational modifiers
    if (context.situation === 'surprised') {
      baseMorale -= 1;
    } else if (context.environmentFactor === 'lair') {
      baseMorale += 1;
    }

    return Math.max(2, Math.min(12, baseMorale));
  }

  /**
   * Determine primary behavior pattern
   */
  private determinePrimaryBehavior(
    monster: Monster,
    context: MonsterBehaviorContext,
    reaction: string
  ): BehaviorPattern {
    // Use special abilities to infer intelligence level
    const hasAdvancedAbilities = monster.data.specialAbilities?.some((ability: string) =>
      ['spellcasting', 'charm', 'teleport', 'illusion'].includes(ability)
    );

    // Base behavior based on reaction
    switch (reaction) {
      case 'hostile':
        return {
          action: 'attack',
          confidence: 80,
          aggression: 90,
          tactics: hasAdvancedAbilities ? ['tactical-spells'] : ['direct-assault'],
          priority: 1,
        };

      case 'unfriendly':
        return context.situation === 'encounter'
          ? {
              action: 'guard',
              confidence: 60,
              aggression: 70,
              tactics: ['defensive-posture'],
              priority: 1,
            }
          : {
              action: 'retreat',
              confidence: 40,
              aggression: 30,
              tactics: ['fighting-withdrawal'],
              priority: 1,
            };

      case 'neutral':
        return {
          action: 'parley',
          confidence: 50,
          aggression: 40,
          tactics: ['cautious-approach'],
          priority: 1,
        };

      case 'friendly':
        return {
          action: 'negotiate',
          confidence: 70,
          aggression: 20,
          tactics: ['communication'],
          priority: 1,
        };

      case 'helpful':
        return {
          action: 'negotiate',
          confidence: 90,
          aggression: 10,
          tactics: ['cooperation'],
          priority: 1,
        };

      default:
        return {
          action: 'guard',
          confidence: 50,
          aggression: 50,
          tactics: ['defensive'],
          priority: 1,
        };
    }
  }

  /**
   * Determine alternative behaviors
   */
  private determineAlternativeBehaviors(
    monster: Monster,
    _context: MonsterBehaviorContext,
    _reaction: string
  ): BehaviorPattern[] {
    const alternatives: BehaviorPattern[] = [];

    // Always have a flee option for most creatures (unless mindless/undead)
    const hasBasicIntelligence = monster.data.specialAbilities?.length > 0 || monster.level > 1;
    if (hasBasicIntelligence) {
      alternatives.push({
        action: 'flee',
        confidence: 20,
        aggression: 10,
        tactics: ['escape-route'],
        priority: 2,
      });
    }

    // Combat alternatives based on situation
    alternatives.push({
      action: 'retreat',
      confidence: 30,
      aggression: 40,
      tactics: ['tactical-withdrawal'],
      priority: 3,
    });

    return alternatives;
  }

  /**
   * Determine tactical approach
   */
  private determineTactics(monster: Monster, context: MonsterBehaviorContext): string[] {
    const tactics: string[] = [];
    const specialAbilities = monster.data.specialAbilities || [];

    // Simple intelligence inference based on special abilities and level
    const hasAdvancedAbilities = specialAbilities.some((ability) =>
      ['spellcasting', 'charm', 'teleport', 'illusion', 'fear'].includes(ability)
    );
    const hasBasicAbilities = specialAbilities.length > 0;
    const highLevel = monster.level >= 5;

    // Intelligence-based tactics
    if (hasAdvancedAbilities || highLevel) {
      tactics.push('coordinated-attacks', 'terrain-advantage');
    } else if (hasBasicAbilities) {
      tactics.push('flanking', 'focus-fire');
    } else {
      tactics.push('direct-assault', 'pack-hunting');
    }

    // Environmental tactics
    if (context.environmentFactor === 'lair') {
      tactics.push('lair-advantage', 'escape-routes');
    }

    // Special ability tactics
    if (specialAbilities.includes('spellcasting')) {
      tactics.push('spell-first');
    }
    if (specialAbilities.includes('breath-weapon')) {
      tactics.push('breath-weapon-opening');
    }

    return tactics;
  }

  /**
   * Determine special actions based on monster abilities
   */
  private determineSpecialActions(monster: Monster, _context: MonsterBehaviorContext): string[] {
    const actions: string[] = [];
    const specialAbilities = monster.data.specialAbilities || [];

    // Check for special abilities
    for (const ability of specialAbilities) {
      switch (ability) {
        case 'regeneration':
          actions.push('sustained-combat');
          break;
        case 'invisibility':
          actions.push('stealth-approach');
          break;
        case 'fear-aura':
          actions.push('intimidation-first');
          break;
        case 'charm':
          actions.push('social-manipulation');
          break;
        case 'teleport':
          actions.push('hit-and-run');
          break;
        case 'spellcasting':
          actions.push('magic-priority');
          break;
        case 'breath-weapon':
          actions.push('breath-opener');
          break;
      }
    }

    return actions;
  }

  /**
   * Create human-readable behavior summary
   */
  private createBehaviorSummary(result: MonsterBehaviorResult, monster: Monster): string {
    const primaryAction = result.primaryBehavior.action;
    const reactionText = result.reaction;
    const moraleText = result.morale >= 10 ? 'high' : result.morale >= 7 ? 'average' : 'low';

    return `${monster.name}: ${reactionText} reaction, ${primaryAction} behavior, ${moraleText} morale (${result.morale})`;
  }
}
