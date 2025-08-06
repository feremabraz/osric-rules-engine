import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';

export interface SpecialAbility {
  name: string;
  type:
    | 'breath-weapon'
    | 'gaze-attack'
    | 'spell-like'
    | 'regeneration'
    | 'immunity'
    | 'resistance'
    | 'special-attack';
  description: string;
  usageFrequency: 'at-will' | 'per-day' | 'per-encounter' | 'recharge' | 'constant';
  usesPerDay?: number;
  rechargeOn?: number;
  damage?: string;
  saveType?: 'death' | 'petrification' | 'wands' | 'breath' | 'spells';
  saveModifier?: number;
  range?: string;
  duration?: string;
  requirements?: string[];
}

export interface SpecialAbilityContext {
  monsterType: string;
  hitDice: number;
  size: string;
  alignment: string;
  intelligence: number;
  environment: string;
}

export class SpecialAbilityRules extends BaseRule {
  readonly name = RULE_NAMES.SPECIAL_ABILITIES;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.MONSTER_GENERATION;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const abilityContext = this.getTemporaryData<SpecialAbilityContext>(
      context,
      'specialAbilityContext'
    );

    if (!abilityContext) {
      return this.createFailureResult('No special ability context provided');
    }

    try {
      const abilities = this.generateSpecialAbilities(abilityContext);

      this.setTemporaryData(context, 'specialAbilities', abilities);

      return this.createSuccessResult(
        `Generated ${abilities.length} special abilities for ${abilityContext.monsterType}`,
        {
          abilities,
          abilityDescriptions: abilities.map((a) => `${a.name}: ${a.description}`),
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to generate special abilities: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateSpecialAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    if (context.hitDice >= 10) {
      abilities.push(...this.getHighTierAbilities(context));
    } else if (context.hitDice >= 5) {
      abilities.push(...this.getMidTierAbilities(context));
    } else {
      abilities.push(...this.getLowTierAbilities(context));
    }

    abilities.push(...this.getTypeSpecificAbilities(context));

    if (context.intelligence >= 12) {
      abilities.push(...this.getIntelligentAbilities(context));
    }

    abilities.push(...this.getAlignmentAbilities(context));

    abilities.push(...this.getEnvironmentAbilities(context));

    const uniqueAbilities = this.deduplicateAbilities(abilities);
    return uniqueAbilities.slice(0, Math.min(6, Math.floor(context.hitDice / 2) + 1));
  }

  private getHighTierAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    if (context.size === 'Large' || context.size === 'Huge') {
      abilities.push({
        name: 'Devastating Breath Weapon',
        type: 'breath-weapon',
        description: `Cone of destructive energy dealing ${context.hitDice}d6 damage`,
        usageFrequency: 'per-encounter',
        damage: `${context.hitDice}d6`,
        saveType: 'breath',
        saveModifier: 0,
        range: `${context.hitDice * 10} feet cone`,
        duration: 'Instantaneous',
      });
    }

    if (context.intelligence >= 15) {
      const spellLevel = Math.min(9, Math.floor(context.hitDice / 2));
      abilities.push({
        name: `Spell-like Ability (Level ${spellLevel})`,
        type: 'spell-like',
        description: `Can cast spells as ${spellLevel}th level caster`,
        usageFrequency: 'per-day',
        usesPerDay: Math.max(1, Math.floor(context.hitDice / 3)),
        range: 'Varies',
        duration: 'Varies',
      });
    }

    abilities.push({
      name: 'Dominating Gaze',
      type: 'gaze-attack',
      description: 'Targets must save or be dominated',
      usageFrequency: 'at-will',
      saveType: 'spells',
      saveModifier: -2,
      range: '60 feet',
      duration: '1 turn per HD',
    });

    return abilities;
  }

  private getMidTierAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    abilities.push({
      name: 'Energy Burst',
      type: 'breath-weapon',
      description: `Energy attack dealing ${Math.floor(context.hitDice / 2)}d6 damage`,
      usageFrequency: 'recharge',
      rechargeOn: 5,
      damage: `${Math.floor(context.hitDice / 2)}d6`,
      saveType: 'breath',
      range: '30 feet radius',
      duration: 'Instantaneous',
    });

    if (context.intelligence >= 10) {
      abilities.push({
        name: 'Lesser Spell-like Ability',
        type: 'spell-like',
        description: 'Can cast low-level spells',
        usageFrequency: 'per-day',
        usesPerDay: Math.max(1, Math.floor(context.hitDice / 4)),
        range: 'Varies',
        duration: 'Varies',
      });
    }

    abilities.push({
      name: 'Frightening Presence',
      type: 'special-attack',
      description: 'Causes fear in creatures of lower HD',
      usageFrequency: 'at-will',
      saveType: 'spells',
      range: '30 feet radius',
      duration: '1d6 rounds',
    });

    return abilities;
  }

  private getLowTierAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    abilities.push({
      name: 'Minor Resistance',
      type: 'resistance',
      description: `Resistance to ${context.hitDice > 2 ? 'multiple damage types' : 'one damage type'}`,
      usageFrequency: 'constant',
      duration: 'Permanent',
    });

    if (context.intelligence >= 5) {
      abilities.push({
        name: 'Cunning Attack',
        type: 'special-attack',
        description: 'Unique tactical attack method',
        usageFrequency: 'per-encounter',
        range: 'Melee',
        duration: 'Instantaneous',
      });
    } else {
      abilities.push({
        name: 'Instinctive Attack',
        type: 'special-attack',
        description: 'Natural attack pattern',
        usageFrequency: 'per-encounter',
        range: 'Melee',
        duration: 'Instantaneous',
      });
    }

    return abilities;
  }

  private getTypeSpecificAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];
    const type = context.monsterType.toLowerCase();

    if (type.includes('undead')) {
      abilities.push({
        name: 'Undead Immunities',
        type: 'immunity',
        description: 'Immune to sleep, charm, hold, death magic, poisons, and disease',
        usageFrequency: 'constant',
        duration: 'Permanent',
      });

      abilities.push({
        name: 'Life Drain',
        type: 'special-attack',
        description: 'Drains life energy on touch',
        usageFrequency: 'per-encounter',
        saveType: 'death',
        range: 'Touch',
        duration: 'Permanent',
      });
    }

    if (type.includes('dragon')) {
      abilities.push({
        name: 'Dragon Breath',
        type: 'breath-weapon',
        description: `Breath weapon dealing ${context.hitDice}d8 damage`,
        usageFrequency: 'per-encounter',
        damage: `${context.hitDice}d8`,
        saveType: 'breath',
        range: `${context.hitDice * 15} feet`,
        duration: 'Instantaneous',
      });

      abilities.push({
        name: 'Spell Use',
        type: 'spell-like',
        description: 'Can cast spells as magic-user',
        usageFrequency: 'per-day',
        usesPerDay: Math.floor(context.hitDice / 2),
        range: 'Varies',
        duration: 'Varies',
      });
    }

    if (type.includes('demon') || type.includes('devil')) {
      abilities.push({
        name: 'Magic Resistance',
        type: 'resistance',
        description: `${context.hitDice * 5}% magic resistance`,
        usageFrequency: 'constant',
        duration: 'Permanent',
      });

      abilities.push({
        name: 'Teleport',
        type: 'spell-like',
        description: 'Can teleport at will',
        usageFrequency: 'at-will',
        range: 'Unlimited',
        duration: 'Instantaneous',
      });
    }

    if (type.includes('elemental')) {
      abilities.push({
        name: 'Elemental Immunity',
        type: 'immunity',
        description: 'Immune to own element and non-magical weapons',
        usageFrequency: 'constant',
        duration: 'Permanent',
      });
    }

    return abilities;
  }

  private getIntelligentAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    if (context.intelligence >= 18) {
      abilities.push({
        name: 'Tactical Genius',
        type: 'special-attack',
        description: 'Can coordinate complex battle strategies',
        usageFrequency: 'constant',
        duration: 'Permanent',
      });
    }

    if (context.intelligence >= 15) {
      abilities.push({
        name: 'Spellcasting',
        type: 'spell-like',
        description: 'Can cast spells as intelligent creature',
        usageFrequency: 'per-day',
        usesPerDay: Math.floor(context.intelligence / 3),
        range: 'Varies',
        duration: 'Varies',
      });
    }

    return abilities;
  }

  private getAlignmentAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    if (context.alignment.includes('Chaotic Evil')) {
      abilities.push({
        name: 'Aura of Evil',
        type: 'special-attack',
        description: 'Radiates malevolent energy',
        usageFrequency: 'constant',
        range: '10 feet radius',
        duration: 'Permanent',
      });
    }

    if (context.alignment.includes('Lawful Good')) {
      abilities.push({
        name: 'Protection Aura',
        type: 'special-attack',
        description: 'Provides protective benefits to allies',
        usageFrequency: 'constant',
        range: '10 feet radius',
        duration: 'Permanent',
      });
    }

    return abilities;
  }

  private getEnvironmentAbilities(context: SpecialAbilityContext): SpecialAbility[] {
    const abilities: SpecialAbility[] = [];

    switch (context.environment.toLowerCase()) {
      case 'underwater':
        abilities.push({
          name: 'Aquatic Adaptation',
          type: 'immunity',
          description: 'Moves freely underwater, cannot drown',
          usageFrequency: 'constant',
          duration: 'Permanent',
        });
        break;

      case 'arctic':
        abilities.push({
          name: 'Cold Immunity',
          type: 'immunity',
          description: 'Immune to cold damage and effects',
          usageFrequency: 'constant',
          duration: 'Permanent',
        });
        break;

      case 'desert':
        abilities.push({
          name: 'Heat Tolerance',
          type: 'resistance',
          description: 'Resistant to heat and fire damage',
          usageFrequency: 'constant',
          duration: 'Permanent',
        });
        break;

      case 'volcanic':
        abilities.push({
          name: 'Fire Immunity',
          type: 'immunity',
          description: 'Immune to fire damage',
          usageFrequency: 'constant',
          duration: 'Permanent',
        });
        break;
    }

    return abilities;
  }

  private deduplicateAbilities(abilities: SpecialAbility[]): SpecialAbility[] {
    const seen = new Set<string>();
    return abilities.filter((ability) => {
      if (seen.has(ability.name)) {
        return false;
      }
      seen.add(ability.name);
      return true;
    });
  }
}
