import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface MonsterBehaviorContext {
  monsterId: string;
  situation: 'combat' | 'encounter' | 'surprised' | 'hunting' | 'territorial';
  stimuli?: {
    playerActions?: string[];
    nearbyAllies?: number;
    nearbyEnemies?: number;
    healthStatus?: 'healthy' | 'wounded' | 'near-death';
    treasurePresent?: boolean;
    territoryThreatened?: boolean;
  };
}

export interface Stimuli {
  playerActions?: string[];
  nearbyAllies?: number;
  nearbyEnemies?: number;
  healthStatus?: 'healthy' | 'wounded' | 'near-death';
  treasurePresent?: boolean;
  territoryThreatened?: boolean;
}

export class MonsterBehaviorRules extends BaseRule {
  readonly name = RULE_NAMES.MONSTER_BEHAVIOR;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.MONSTER_GENERATION;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      const behaviorData = context.getTemporary<MonsterBehaviorContext>(
        'npc:monster:behavior-params'
      );

      if (!behaviorData) {
        return this.createFailureResult('No monster behavior data provided');
      }

      const { monsterId, situation, stimuli = {} } = behaviorData;

      const monster = context.getEntity<Monster>(monsterId);
      if (!monster) {
        return this.createFailureResult(`Monster with ID "${monsterId}" not found`);
      }

      const behaviorResult = this.determineBehavior(monster, situation, stimuli);

      if (behaviorResult.modifiedMonster) {
        context.setEntity(monsterId, behaviorResult.modifiedMonster);
      }

      return this.createSuccessResult('Monster behavior determined', {
        behavior: behaviorResult.behavior,
        actions: behaviorResult.suggestedActions,
        modifications: behaviorResult.modifications,
      });
    } catch (error) {
      return this.createFailureResult(
        `Monster behavior determination failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private determineBehavior(
    monster: Monster,
    situation: string,
    stimuli: Stimuli
  ): {
    behavior: string;
    suggestedActions: string[];
    modifications: string[];
    modifiedMonster?: Monster;
  } {
    const intelligence = this.getIntelligenceLevel(monster);
    const alignment = monster.alignment;
    const morale = monster.morale;

    let behavior = 'neutral';
    const suggestedActions: string[] = [];
    const modifications: string[] = [];

    switch (intelligence) {
      case 'non-intelligent':
        behavior = this.determineAnimalBehavior(situation, stimuli);
        break;
      case 'animal':
        behavior = this.determineAnimalBehavior(situation, stimuli);
        suggestedActions.push('React to immediate threats only');
        break;
      case 'semi-intelligent':
        behavior = this.determineSemiIntelligentBehavior(situation, stimuli, alignment);
        suggestedActions.push('Use simple tactics');
        break;
      case 'low-intelligent':
        behavior = this.determineLowIntelligentBehavior(situation, stimuli, alignment);
        suggestedActions.push('Basic cooperation', 'Simple ambush tactics');
        break;
      case 'average':
      case 'intelligent':
        behavior = this.determineIntelligentBehavior(situation, stimuli, alignment, morale);
        suggestedActions.push('Complex tactics', 'Coordinate with allies', 'Use terrain advantage');
        break;
      case 'highly-intelligent':
      case 'genius':
        behavior = this.determineGeniusBehavior(situation, stimuli, alignment, morale);
        suggestedActions.push('Advanced strategy', 'Magical tactics', 'Psychological warfare');
        break;
    }

    this.applyAlignmentModifications(alignment, suggestedActions, modifications);

    if (morale <= 4) {
      modifications.push('Low morale - likely to flee');
      suggestedActions.push('Check morale frequently');
    } else if (morale >= 10) {
      modifications.push('High morale - fights to the death');
      suggestedActions.push('Aggressive behavior');
    }

    return { behavior, suggestedActions, modifications };
  }

  private getIntelligenceLevel(monster: Monster): string {
    const hdMatch = monster.hitDice.match(/^(\d+)/);
    const baseHD = hdMatch ? Number.parseInt(hdMatch[1]) : 1;

    if (baseHD <= 1) return 'animal';
    if (baseHD <= 3) return 'semi-intelligent';
    if (baseHD <= 5) return 'low-intelligent';
    if (baseHD <= 8) return 'average';
    if (baseHD <= 12) return 'intelligent';
    return 'highly-intelligent';
  }

  private determineAnimalBehavior(situation: string, stimuli: Stimuli): string {
    if (situation === 'combat') {
      return stimuli.healthStatus === 'near-death' ? 'flee' : 'fight-basic';
    }
    if (situation === 'territorial') {
      return 'defend-territory';
    }
    if (situation === 'hunting') {
      return 'hunt-prey';
    }
    return 'cautious';
  }

  private determineSemiIntelligentBehavior(
    situation: string,
    stimuli: Stimuli,
    alignment: string
  ): string {
    if (alignment.includes('chaotic')) {
      return situation === 'combat' ? 'aggressive' : 'hostile';
    }
    if (alignment.includes('lawful')) {
      return situation === 'combat' ? 'defensive' : 'cautious';
    }

    if (stimuli.nearbyEnemies && stimuli.nearbyEnemies > (stimuli.nearbyAllies || 0)) {
      return 'retreat';
    }

    return situation === 'combat' ? 'cautious' : 'neutral';
  }

  private determineLowIntelligentBehavior(
    situation: string,
    stimuli: Stimuli,
    alignment: string
  ): string {
    const hasAllies = (stimuli.nearbyAllies || 0) > 0;

    if (situation === 'combat') {
      if (hasAllies) {
        return alignment.includes('Evil') ? 'pack-attack' : 'coordinated-defense';
      }
      return 'tactical-combat';
    }

    return alignment.includes('Evil') ? 'threatening' : 'wary';
  }

  private determineIntelligentBehavior(
    situation: string,
    stimuli: Stimuli,
    alignment: string,
    morale: number
  ): string {
    const outnumbered = (stimuli.nearbyEnemies || 0) > (stimuli.nearbyAllies || 1);

    if (situation === 'combat') {
      if (outnumbered && morale < 8) {
        return 'tactical-retreat';
      }
      return 'strategic-combat';
    }

    if (situation === 'encounter') {
      if (alignment.includes('Evil')) {
        return stimuli.treasurePresent ? 'acquisitive' : 'threatening';
      }
      return 'diplomatic-possible';
    }

    return 'intelligent-assessment';
  }

  private determineGeniusBehavior(
    situation: string,
    stimuli: Stimuli,
    alignment: string,
    morale: number
  ): string {
    const numericalAdvantage = (stimuli.nearbyAllies || 0) > (stimuli.nearbyEnemies || 0);

    if (stimuli.healthStatus === 'near-death') {
      return 'strategic-retreat';
    }

    if (situation === 'combat') {
      if (alignment.includes('Evil') && numericalAdvantage && morale >= 12) {
        return 'overwhelming-tactics';
      }
      if (alignment.includes('Good')) {
        return stimuli.healthStatus === 'wounded' ? 'defensive-tactics' : 'tactical-defense';
      }
      return 'masterful-tactics';
    }

    if (situation === 'encounter') {
      if (alignment.includes('Evil')) {
        return stimuli.treasurePresent ? 'manipulative-acquisition' : 'manipulative';
      }
      if (alignment.includes('Good')) {
        return 'helpful-sage';
      }
      return 'enigmatic';
    }

    return 'calculating';
  }

  private applyAlignmentModifications(
    alignment: string,
    actions: string[],
    modifications: string[]
  ): void {
    if (alignment.includes('Lawful')) {
      modifications.push('Follows rules and hierarchy');
      actions.push('Respect authority', 'Honor agreements');
    }

    if (alignment.includes('Chaotic')) {
      modifications.push('Unpredictable and independent');
      actions.push('Act impulsively', 'Ignore conventions');
    }

    if (alignment.includes('Evil')) {
      modifications.push('Self-serving and cruel');
      actions.push('Exploit weakness', 'Show no mercy');
    }

    if (alignment.includes('Good')) {
      modifications.push('Protective and altruistic');
      actions.push('Protect innocents', 'Show mercy');
    }
  }
}
