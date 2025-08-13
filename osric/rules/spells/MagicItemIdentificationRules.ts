import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult, isSuccess } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import type { IdentificationResult } from '@osric/types/spell-types';

export class MagicItemIdentificationRules extends BaseRule {
  name = RULE_NAMES.MAGIC_ITEM_IDENTIFICATION;
  description = 'Handle magic item identification through different methods';

  canApply(context: GameContext): boolean {
    const identificationAttempt = context.getTemporary(ContextKeys.SPELL_IDENTIFICATION_ATTEMPT);
    return identificationAttempt !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const identificationAttempt = context.getTemporary<{
      character: Character;
      item: Item;
      method: 'identify_spell' | 'arcane_study' | 'divine_knowledge';
      hasPearl?: boolean;
    }>(ContextKeys.SPELL_IDENTIFICATION_ATTEMPT);

    if (!identificationAttempt) {
      return this.createFailureResult('No identification attempt data found');
    }

    const { character, item, method, hasPearl = false } = identificationAttempt;

    let result: IdentificationResult;

    switch (method) {
      case 'identify_spell':
        result = this.performIdentifySpell(character, item, hasPearl);
        break;
      case 'arcane_study':
        result = this.performArcaneStudy(character, item);
        break;
      case 'divine_knowledge':
        result = this.performDivineKnowledge(character, item);
        break;
      default:
        return this.createFailureResult('Unknown identification method');
    }

    if (result.constitutionLoss > 0) {
      const updatedCharacter = {
        ...character,
        abilities: {
          ...character.abilities,
          constitution: Math.max(1, character.abilities.constitution - result.constitutionLoss),
        },
        statusEffects: [
          ...character.statusEffects,
          {
            name: 'Constitution Loss (Identification)',
            duration: result.constitutionLoss * 8,
            description: `Lost ${result.constitutionLoss} constitution from magical identification`,
            effect: 'constitution_drain',
            savingThrow: null,
            endCondition: 'time',
          },
        ],
      };

      context.setEntity(character.id, updatedCharacter);
    }

    const message = isSuccess(result)
      ? `${character.name} successfully identifies ${item.name} using ${method.replace('_', ' ')}`
      : `${character.name} fails to identify ${item.name} using ${method.replace('_', ' ')}`;

    return this.createSuccessResult(message, {
      method,
      result,
      constitutionLoss: result.constitutionLoss,
    });
  }

  private performIdentifySpell(
    character: Character,
    item: Item,
    hasPearl: boolean
  ): IdentificationResult {
    if (!hasPearl) {
      return {
        kind: 'failure',
        itemIdentified: false,
        propertiesRevealed: [],
        commandWordRevealed: false,
        estimatedCharges: null,
        actualCharges: item.charges || null,
        curseDetected: false,
        constitutionLoss: 0,
      };
    }

    const baseChance = 15;
    const levelBonus = character.level * 5;
    const totalChance = baseChance + levelBonus;

    const successRoll = DiceEngine.roll('1d100');
    const succeeded = successRoll.total <= totalChance;

    const constitutionLoss = 8;

    if (!succeeded) {
      return {
        kind: 'failure',
        itemIdentified: false,
        propertiesRevealed: [],
        commandWordRevealed: false,
        estimatedCharges: null,
        actualCharges: item.charges || null,
        curseDetected: false,
        constitutionLoss,
      };
    }

    const propertiesRevealed = [
      `Item type: ${this.getItemType(item)}`,
      `Magic bonus: ${item.magicBonus || 0}`,
    ];

    const commandWordRoll = DiceEngine.roll('1d100');
    const commandWordRevealed = commandWordRoll.total <= totalChance;

    let estimatedCharges: number | null = null;
    if (item.charges !== null && item.charges !== undefined) {
      const actualCharges = item.charges;
      const variance = Math.floor(actualCharges * 0.25);
      const minEstimate = Math.max(0, actualCharges - variance);
      const maxEstimate = actualCharges + variance;
      const estimateRoll = DiceEngine.roll(`1d${maxEstimate - minEstimate}`);
      estimatedCharges = minEstimate + estimateRoll.total;
    }

    const curseRoll = DiceEngine.roll('1d100');
    const curseDetected = curseRoll.total <= character.level;

    return {
      kind: 'success',
      itemIdentified: true,
      propertiesRevealed,
      commandWordRevealed,
      estimatedCharges,
      actualCharges: item.charges || null,
      curseDetected,
      constitutionLoss,
    };
  }

  private performArcaneStudy(character: Character, item: Item): IdentificationResult {
    const baseChance = 10;
    const intModifier = character.abilities.intelligence - 10;
    const intelligenceBonus = intModifier * 5;
    const levelBonus = character.level * 3;
    const totalChance = baseChance + intelligenceBonus + levelBonus;

    const successRoll = DiceEngine.roll('1d100');
    const succeeded = successRoll.total <= totalChance;

    const constitutionRoll = DiceEngine.roll('1d10');
    const constitutionLoss = constitutionRoll.total === 1 ? DiceEngine.roll('1d3').total : 0;

    if (!succeeded) {
      return {
        kind: 'failure',
        itemIdentified: false,
        propertiesRevealed: [],
        commandWordRevealed: false,
        estimatedCharges: null,
        actualCharges: item.charges || null,
        curseDetected: false,
        constitutionLoss,
      };
    }

    const propertiesRevealed = [
      `Item type: ${this.getItemType(item)}`,
      `Magic bonus: ${item.magicBonus || 0}`,
    ];

    if (character.abilities.intelligence >= 15) {
      propertiesRevealed.push(`Estimated value: ${this.estimateItemValue(item)} gp`);
    }

    if (character.abilities.intelligence >= 17) {
      propertiesRevealed.push(`Origin: ${this.determineItemOrigin(item)}`);
    }

    const commandWordChance = 20 + (character.abilities.intelligence - 10) * 2;
    const commandWordRoll = DiceEngine.roll('1d100');
    const commandWordRevealed = commandWordRoll.total <= commandWordChance;

    let estimatedCharges: number | null = null;
    if (item.charges !== null && item.charges !== undefined) {
      const accuracyModifier = Math.max(0.05, 0.5 - character.abilities.intelligence * 0.02);
      const variance = Math.floor(item.charges * accuracyModifier);
      const minEstimate = Math.max(0, item.charges - variance);
      const maxEstimate = item.charges + variance;
      const estimateRoll = DiceEngine.roll(`1d${maxEstimate - minEstimate}`);
      estimatedCharges = minEstimate + estimateRoll.total;
    }

    const curseDetectionChance = (character.abilities.intelligence - 10) * 2;
    const curseRoll = DiceEngine.roll('1d100');
    const curseDetected = curseRoll.total <= curseDetectionChance;

    return {
      kind: 'success',
      itemIdentified: true,
      propertiesRevealed,
      commandWordRevealed,
      estimatedCharges,
      actualCharges: item.charges || null,
      curseDetected,
      constitutionLoss,
    };
  }

  private performDivineKnowledge(character: Character, item: Item): IdentificationResult {
    const isDivine = ['Cleric', 'Druid', 'Paladin'].includes(character.class);

    if (!isDivine) {
      return {
        kind: 'failure',
        itemIdentified: false,
        propertiesRevealed: [],
        commandWordRevealed: false,
        estimatedCharges: null,
        actualCharges: item.charges || null,
        curseDetected: false,
        constitutionLoss: 0,
      };
    }

    const baseChance = 5;
    const wisdomBonus = (character.abilities.wisdom - 10) * 3;
    const levelBonus = character.level * 2;
    const totalChance = baseChance + wisdomBonus + levelBonus;

    const successRoll = DiceEngine.roll('1d100');
    const succeeded = successRoll.total <= totalChance;

    if (!succeeded) {
      return {
        kind: 'failure',
        itemIdentified: false,
        propertiesRevealed: [],
        commandWordRevealed: false,
        estimatedCharges: null,
        actualCharges: item.charges || null,
        curseDetected: false,
        constitutionLoss: 0,
      };
    }

    const propertiesRevealed = [
      `Item nature: ${this.getItemType(item)}`,
      `Magical aura: ${item.magicBonus ? 'Strong' : 'Moderate'}`,
      `Divine insight: ${this.getDivineInsight(item)}`,
    ];

    const curseRoll = DiceEngine.roll('1d100');
    const curseDetected = curseRoll.total <= character.abilities.wisdom * 3;

    return {
      kind: 'success',
      itemIdentified: true,
      propertiesRevealed,
      commandWordRevealed: false,
      estimatedCharges: null,
      actualCharges: item.charges || null,
      curseDetected,
      constitutionLoss: 0,
    };
  }

  private getItemType(item: Item): string {
    const extendedItem = item as Item & {
      type?: string;
      itemType?: string;
      subType?: string;
    };

    if (extendedItem.type === 'Weapon') return 'Weapon';
    if (extendedItem.type === 'Armor') return 'Armor';
    if (extendedItem.itemType) return extendedItem.itemType;

    return 'Miscellaneous Magic';
  }

  private estimateItemValue(item: Item): number {
    const baseValue = item.value || 1000;
    const variance = 0.2;
    const swing = DiceEngine.roll('1d200').total - 100;
    const multiplier = 1 + (swing / 100) * variance;
    return Math.floor(baseValue * multiplier);
  }

  private determineItemOrigin(item: Item): string {
    const origins = [
      'Ancient elven craftsmanship',
      'Dwarven forge-magic',
      'Wizard academy enchantment',
      'Planar entity binding',
      'Divine blessing',
      'Forgotten empire artifact',
      'Fey-touched enchantment',
      'Necromantic binding',
      'Elemental infusion',
    ];

    const seed = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return origins[seed % origins.length];
  }

  private getDivineInsight(item: Item): string {
    const insights = [
      'Blessed by ancient powers',
      'Touched by divine grace',
      'Forged in holy fire',
      'Consecrated by faith',
      'Imbued with sacred purpose',
      'Sanctified through prayer',
    ];

    const seed = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return insights[seed % insights.length];
  }
}
