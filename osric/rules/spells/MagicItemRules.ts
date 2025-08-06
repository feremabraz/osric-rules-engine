import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { IdentificationResult } from '../../types/SpellTypes';
import type { Character, Item } from '../../types/entities';

export class MagicItemChargeCalculationRule extends BaseRule {
  name = 'magic-item-charge-calculation';
  description = 'Calculate initial charges for newly found magic items';

  canApply(context: GameContext): boolean {
    const item = context.getTemporary('newMagicItem');
    return item !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const item = context.getTemporary<Item & { itemType: string }>('newMagicItem');

    if (!item) {
      return this.createFailureResult('No magic item found for charge calculation');
    }

    let charges = 0;
    let chargeFormula = '';

    switch (item.itemType.toLowerCase()) {
      case 'wand': {
        const wandRoll = rollDice(1, 20);
        charges = 101 - wandRoll.result;
        chargeFormula = '101 - 1d20';
        break;
      }

      case 'rod': {
        const rodRoll = rollDice(1, 10);
        charges = 51 - rodRoll.result;
        chargeFormula = '51 - 1d10';
        break;
      }

      case 'staff': {
        const staffRoll = rollDice(1, 6);
        charges = 26 - staffRoll.result;
        chargeFormula = '26 - 1d6';
        break;
      }

      default:
        return this.createSuccessResult(`${item.name} does not use charges`, {
          itemName: item.name,
          itemType: item.itemType,
          charges: null,
          chargeFormula: 'N/A',
        });
    }

    const updatedItem = {
      ...item,
      charges,
    };

    context.setTemporary('updatedMagicItem', updatedItem);

    const message = `${item.name} (${item.itemType}) has ${charges} charges (${chargeFormula})`;

    return this.createSuccessResult(message, {
      itemName: item.name,
      itemType: item.itemType,
      charges,
      chargeFormula,
    });
  }
}

export class MagicItemChargeUsageRule extends BaseRule {
  name = 'magic-item-charge-usage';
  description = 'Handle using charges from magic items';

  canApply(context: GameContext): boolean {
    const item = context.getTemporary('magicItemToUse');
    return item !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const item = context.getTemporary<Item>('magicItemToUse');
    const user = context.getTemporary<Character>('itemUser');

    if (!item || !user) {
      return this.createFailureResult('Missing item or user information');
    }

    if (item.charges === null || item.charges === undefined) {
      return this.createSuccessResult(`${item.name} doesn't use charges`, {
        itemName: item.name,
        chargesRemaining: null,
        disintegrated: false,
      });
    }

    if (item.charges <= 0) {
      const message = `${item.name} has no charges left and disintegrates into dust!`;

      if (user.inventory) {
        const itemIndex = user.inventory.findIndex((invItem) => invItem.id === item.id);
        if (itemIndex >= 0) {
          user.inventory.splice(itemIndex, 1);
          context.setEntity(user.id, user);
        }
      }

      return this.createFailureResult(message, {
        itemName: item.name,
        chargesRemaining: 0,
        disintegrated: true,
      });
    }

    const newCharges = item.charges - 1;
    const disintegrated = newCharges === 0;

    const updatedItem = {
      ...item,
      charges: newCharges,
    };

    context.setTemporary('updatedMagicItem', updatedItem);

    let message: string;
    if (disintegrated) {
      message = `${item.name} is used one final time and disintegrates into dust!`;

      if (user.inventory) {
        const itemIndex = user.inventory.findIndex((invItem) => invItem.id === item.id);
        if (itemIndex >= 0) {
          user.inventory.splice(itemIndex, 1);
          context.setEntity(user.id, user);
        }
      }
    } else {
      message = `${item.name} is used. ${newCharges} charge${newCharges !== 1 ? 's' : ''} remaining.`;
    }

    return this.createSuccessResult(message, {
      itemName: item.name,
      chargesRemaining: newCharges,
      disintegrated,
    });
  }
}

export class MagicItemSavingThrowRule extends BaseRule {
  name = 'magic-item-saving-throw';
  description = 'Handle magic item saving throws against destructive effects';

  private readonly ITEM_SAVING_THROWS = {
    potion: 20,
    ring: 17,
    rod: 14,
    scroll: 19,
    staff: 13,
    wand: 15,
    artifact: 13,
    armor: 11,
    armorPowerful: 8,
    sword: 9,
    swordHoly: 7,
    miscMagic: 12,
  };

  canApply(context: GameContext): boolean {
    const savingThrowData = context.getTemporary('magicItemSavingThrow');
    return savingThrowData !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const savingThrowData = context.getTemporary<{
      item: Item;
      effectType: 'rod_of_cancellation' | 'dispel_magic' | 'antimagic_field';
    }>('magicItemSavingThrow');

    if (!savingThrowData) {
      return this.createFailureResult('No saving throw data found');
    }

    const { item, effectType } = savingThrowData;

    const itemType = this.determineItemType(item);

    const baseTarget = this.ITEM_SAVING_THROWS[itemType];

    let adjustedTarget = baseTarget;
    switch (effectType) {
      case 'dispel_magic':
        adjustedTarget += 2;
        break;
      case 'antimagic_field':
        adjustedTarget += 4;
        break;
      case 'rod_of_cancellation':
        break;
    }

    const savingThrowRoll = rollDice(1, 20);
    const success = savingThrowRoll.result >= adjustedTarget;

    const effectName = this.formatEffectType(effectType);
    let message: string;

    if (success) {
      message = `${item.name} resists the ${effectName}! (rolled ${savingThrowRoll.result} vs ${adjustedTarget})`;
    } else {
      message = `${item.name} fails to resist the ${effectName} and is affected. (rolled ${savingThrowRoll.result} vs ${adjustedTarget})`;
    }

    return this.createSuccessResult(message, {
      itemName: item.name,
      itemType,
      effectType,
      targetRoll: adjustedTarget,
      actualRoll: savingThrowRoll.result,
      success,
    });
  }

  private determineItemType(item: Item): keyof typeof this.ITEM_SAVING_THROWS {
    const extendedItem = item as Item & {
      itemType?: string;
      type?: string;
      subType?: string;
      isHoly?: boolean;
      magicBonus?: number;
    };

    if (extendedItem.itemType) {
      switch (extendedItem.itemType.toLowerCase()) {
        case 'potion':
          return 'potion';
        case 'ring':
          return 'ring';
        case 'rod':
          return 'rod';
        case 'scroll':
          return 'scroll';
        case 'staff':
          return 'staff';
        case 'wand':
          return 'wand';
        case 'artifact':
          return 'artifact';
      }
    }

    if (extendedItem.type === 'Armor') {
      return extendedItem.magicBonus === 5 ? 'armorPowerful' : 'armor';
    }

    if (extendedItem.type === 'Weapon' && extendedItem.subType === 'sword') {
      return extendedItem.isHoly ? 'swordHoly' : 'sword';
    }

    return 'miscMagic';
  }

  private formatEffectType(effectType: string): string {
    return effectType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export class MagicItemIdentificationRule extends BaseRule {
  name = 'magic-item-identification';
  description = 'Handle magic item identification through different methods';

  canApply(context: GameContext): boolean {
    const identificationAttempt = context.getTemporary('identificationAttempt');
    return identificationAttempt !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const identificationAttempt = context.getTemporary<{
      character: Character;
      item: Item;
      method: 'identify_spell' | 'arcane_study' | 'divine_knowledge';
      hasPearl?: boolean;
    }>('identificationAttempt');

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

    const message = result.success
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
        success: false,
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

    const successRoll = rollDice(1, 100);
    const success = successRoll.result <= totalChance;

    const constitutionLoss = 8;

    if (!success) {
      return {
        success: false,
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

    const commandWordRoll = rollDice(1, 100);
    const commandWordRevealed = commandWordRoll.result <= totalChance;

    let estimatedCharges: number | null = null;
    if (item.charges !== null && item.charges !== undefined) {
      const actualCharges = item.charges;
      const variance = Math.floor(actualCharges * 0.25);
      const minEstimate = Math.max(0, actualCharges - variance);
      const maxEstimate = actualCharges + variance;
      const estimateRoll = rollDice(1, maxEstimate - minEstimate);
      estimatedCharges = minEstimate + estimateRoll.result;
    }

    const curseRoll = rollDice(1, 100);
    const curseDetected = curseRoll.result <= character.level;

    return {
      success: true,
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

    const successRoll = rollDice(1, 100);
    const success = successRoll.result <= totalChance;

    const constitutionRoll = rollDice(1, 10);
    const constitutionLoss = constitutionRoll.result === 1 ? rollDice(1, 3).result : 0;

    if (!success) {
      return {
        success: false,
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
    const commandWordRoll = rollDice(1, 100);
    const commandWordRevealed = commandWordRoll.result <= commandWordChance;

    let estimatedCharges: number | null = null;
    if (item.charges !== null && item.charges !== undefined) {
      const accuracyModifier = Math.max(0.05, 0.5 - character.abilities.intelligence * 0.02);
      const variance = Math.floor(item.charges * accuracyModifier);
      const minEstimate = Math.max(0, item.charges - variance);
      const maxEstimate = item.charges + variance;
      const estimateRoll = rollDice(1, maxEstimate - minEstimate);
      estimatedCharges = minEstimate + estimateRoll.result;
    }

    const curseDetectionChance = (character.abilities.intelligence - 10) * 2;
    const curseRoll = rollDice(1, 100);
    const curseDetected = curseRoll.result <= curseDetectionChance;

    return {
      success: true,
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
        success: false,
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

    const successRoll = rollDice(1, 100);
    const success = successRoll.result <= totalChance;

    if (!success) {
      return {
        success: false,
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

    const curseRoll = rollDice(1, 100);
    const curseDetected = curseRoll.result <= character.abilities.wisdom * 3;

    return {
      success: true,
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
    const multiplier = 1 + (Math.random() * 2 * variance - variance);
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
