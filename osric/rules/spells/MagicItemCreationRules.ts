import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';

interface MagicItemCreationParameters {
  characterId: string;
  itemType:
    | 'scroll'
    | 'potion'
    | 'weapon'
    | 'armor'
    | 'ring'
    | 'wand'
    | 'rod'
    | 'staff'
    | 'miscellaneous';
  baseItemId?: string;
  spellsToScribe?: string[];
  potionType?: string;
  enchantmentLevel?: number;
  materialComponents?: {
    name: string;
    cost: number;
    quantity: number;
    available: boolean;
  }[];
  workspaceQuality?: 'basic' | 'good' | 'excellent' | 'legendary';
  assistantPresent?: boolean;
}

export class MagicItemCreationRules extends BaseRule {
  readonly name = RULE_NAMES.MAGIC_ITEM_RULES;
  readonly description = 'Handle magic item creation mechanics';

  canApply(context: GameContext): boolean {
    return context.getTemporary(ContextKeys.SPELL_MAGIC_ITEM_CREATION_PARAMS) !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const params = context.getTemporary<MagicItemCreationParameters>(
      ContextKeys.SPELL_MAGIC_ITEM_CREATION_PARAMS
    );

    if (!params) {
      return this.createFailureResult('No magic item creation parameters found');
    }

    const character = context.getEntity<Character>(params.characterId);
    if (!character) {
      return this.createFailureResult('Character not found', { characterId: params.characterId });
    }

    const validation = this.validateCreator(character, params.itemType);
    if (!validation.valid) {
      return this.createFailureResult(validation.reason, { itemType: params.itemType });
    }

    const requirements = this.calculateCreationRequirements(character, params);
    const requirementCheck = this.checkRequirements(character, params, requirements);
    if (!requirementCheck.valid) {
      return this.createFailureResult(requirementCheck.reason, {
        requirements,
        missing: requirementCheck.missing,
      });
    }

    const creationResult = this.attemptCreation(character, requirements, params);

    if (creationResult.kind === 'success' && creationResult.item) {
      const updatedCharacter = this.updateCharacterAfterCreation(
        character,
        params,
        requirements,
        creationResult.item,
        true
      );
      context.setEntity(params.characterId, updatedCharacter);

      return this.createSuccessResult(`Successfully created ${creationResult.item.name}`, {
        item: creationResult.item,
        timeSpent: requirements.timeInDays,
        goldSpent: requirements.totalCost,
        materialsUsed: requirements.specialRequirements,
      });
    }

    const failedCharacter = this.updateCharacterAfterCreation(
      character,
      params,
      requirements,
      null,
      false
    );
    context.setEntity(params.characterId, failedCharacter);

    return this.createFailureResult(
      `Magic item creation failed: ${creationResult.reason}` as string,
      {
        timeSpent: requirements.timeInDays,
        goldLost: Math.floor(requirements.totalCost * 0.75),
        materialsLost: creationResult.costsIncurred.materials,
      }
    );
  }

  private validateCreator(
    character: Character,
    itemType: string
  ): { valid: boolean; reason: string } {
    const creatorRequirements: Record<string, { classes: string[]; minLevel: number }> = {
      scroll: { classes: ['magic-user', 'cleric', 'druid', 'illusionist'], minLevel: 1 },
      potion: { classes: ['magic-user', 'cleric', 'druid'], minLevel: 3 },
      weapon: { classes: ['magic-user', 'cleric'], minLevel: 5 },
      armor: { classes: ['magic-user', 'cleric'], minLevel: 5 },
      ring: { classes: ['magic-user'], minLevel: 7 },
      wand: { classes: ['magic-user'], minLevel: 7 },
      rod: { classes: ['magic-user'], minLevel: 9 },
      staff: { classes: ['magic-user'], minLevel: 11 },
      miscellaneous: { classes: ['magic-user', 'cleric'], minLevel: 5 },
    };

    const requirements = creatorRequirements[itemType];
    if (!requirements) {
      return { valid: false, reason: `Unknown item type: ${itemType}` };
    }

    const hasValidClass = Object.keys(character.classes).some((className) =>
      requirements.classes.includes(className.toLowerCase().replace('-', '-'))
    );

    if (!hasValidClass) {
      return {
        valid: false,
        reason: `Character must be ${requirements.classes.join(' or ')} to create ${itemType}`,
      };
    }

    const highestLevel = Math.max(
      ...(Object.values(character.classes).filter((level) => level !== undefined) as number[])
    );
    if (highestLevel < requirements.minLevel) {
      return {
        valid: false,
        reason: `Minimum level ${requirements.minLevel} required to create ${itemType}`,
      };
    }

    return { valid: true, reason: '' };
  }

  private calculateCreationRequirements(
    character: Character,
    parameters: MagicItemCreationParameters
  ): {
    timeInDays: number;
    baseCost: number;
    materialCost: number;
    totalCost: number;
    requiredLevel: number;
    specialRequirements: string[];
    successChance: number;
  } {
    const {
      itemType,
      enchantmentLevel = 1,
      workspaceQuality = 'basic',
      assistantPresent = false,
    } = parameters;

    const baseRequirements: Record<string, { time: number; cost: number; level: number }> = {
      scroll: { time: 1, cost: 100, level: 1 },
      potion: { time: 7, cost: 500, level: 3 },
      weapon: { time: 30, cost: 2000, level: 5 },
      armor: { time: 45, cost: 3000, level: 5 },
      ring: { time: 60, cost: 5000, level: 7 },
      wand: { time: 90, cost: 10000, level: 7 },
      rod: { time: 120, cost: 20000, level: 9 },
      staff: { time: 180, cost: 50000, level: 11 },
      miscellaneous: { time: 14, cost: 1000, level: 5 },
    };

    const base = baseRequirements[itemType];
    let timeInDays = base.time;
    let baseCost = base.cost;

    if (['weapon', 'armor'].includes(itemType) && enchantmentLevel > 1) {
      const multiplier = 2 ** (enchantmentLevel - 1);
      timeInDays *= multiplier;
      baseCost *= multiplier;
    }

    const workspaceMultipliers = {
      basic: { time: 1.0, cost: 1.0, success: 0.6 },
      good: { time: 0.9, cost: 1.1, success: 0.75 },
      excellent: { time: 0.8, cost: 1.25, success: 0.85 },
      legendary: { time: 0.7, cost: 1.5, success: 0.95 },
    };

    const workspace = workspaceMultipliers[workspaceQuality];
    timeInDays = Math.ceil(timeInDays * workspace.time);
    baseCost = Math.floor(baseCost * workspace.cost);

    if (assistantPresent) {
      timeInDays = Math.ceil(timeInDays * 0.8);
    }

    const materialCost = (parameters.materialComponents || []).reduce(
      (total, material) => total + material.cost * material.quantity,
      0
    );

    const characterLevel = Math.max(
      ...(Object.values(character.classes).filter((level) => level !== undefined) as number[])
    );
    let successChance = workspace.success;

    const levelBonus = Math.max(0, characterLevel - base.level) * 0.05;
    successChance = Math.min(0.95, successChance + levelBonus);

    const magicUserLevel = character.classes['Magic-User'];
    if (magicUserLevel && character.abilities.intelligence >= 15) {
      successChance += (character.abilities.intelligence - 14) * 0.02;
    }

    const specialRequirements: string[] = [];
    if (itemType === 'scroll' && parameters.spellsToScribe) {
      specialRequirements.push(`Know spells: ${parameters.spellsToScribe.join(', ')}`);
    }
    if (itemType === 'potion') {
      specialRequirements.push('Alchemical laboratory', 'Rare herbs and ingredients');
    }
    if (['weapon', 'armor'].includes(itemType)) {
      specialRequirements.push('Enchanting circle', 'Precious metal inlays', 'Magical focus gems');
    }

    return {
      timeInDays,
      baseCost,
      materialCost,
      totalCost: baseCost + materialCost,
      requiredLevel: base.level,
      specialRequirements,
      successChance: Math.min(0.95, Math.max(0.05, successChance)),
    };
  }

  private checkRequirements(
    character: Character,
    parameters: MagicItemCreationParameters,
    requirements: {
      totalCost: number;
    }
  ): { valid: boolean; reason: string; missing?: string[] } {
    const missing: string[] = [];

    if (character.currency.gold < requirements.totalCost) {
      missing.push(`${requirements.totalCost - character.currency.gold} gold pieces`);
    }

    const missingMaterials = (parameters.materialComponents || [])
      .filter((material) => !material.available)
      .map((material) => material.name);

    if (missingMaterials.length > 0) {
      missing.push(`Materials: ${missingMaterials.join(', ')}`);
    }

    if (parameters.itemType === 'scroll' && parameters.spellsToScribe) {
      const unknownSpells = parameters.spellsToScribe.filter(
        (spellName) => !character.spells.some((spell) => spell.name === spellName)
      );

      if (unknownSpells.length > 0) {
        missing.push(`Unknown spells: ${unknownSpells.join(', ')}`);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        reason: `Missing requirements: ${missing.join('; ')}`,
        missing,
      };
    }

    return { valid: true, reason: '' };
  }

  private attemptCreation(
    _character: Character,
    requirements: {
      timeInDays: number;
      totalCost: number;
      specialRequirements: string[];
      successChance: number;
    },
    parameters: MagicItemCreationParameters
  ): {
    kind: 'success' | 'failure';
    reason: string;
    item?: Item;
    costsIncurred: { time: number; gold: number; materials: string[] };
  } {
    const roll = DiceEngine.roll('1d100').total;
    const succeeded = roll <= Math.round(requirements.successChance * 100);

    const costsIncurred = {
      time: requirements.timeInDays,
      gold: succeeded ? requirements.totalCost : Math.floor(requirements.totalCost * 0.75),
      materials: requirements.specialRequirements,
    };

    if (!succeeded) {
      const failureReasons = [
        'Magical energy dissipated during the creation process',
        'Materials were not properly aligned during enchantment',
        'Interruption caused the magical binding to fail',
        'Insufficient focus during critical creation phase',
      ];

      const idx = DiceEngine.roll(`1d${failureReasons.length}`).total - 1;
      return {
        kind: 'failure',
        reason: failureReasons[idx],
        costsIncurred,
      };
    }

    const item = this.createMagicItem(parameters, requirements);

    return {
      kind: 'success',
      reason: 'Creation successful',
      item,
      costsIncurred,
    };
  }

  private createMagicItem(
    parameters: MagicItemCreationParameters,
    requirements: { totalCost: number }
  ): Item {
    const { itemType, enchantmentLevel = 1, potionType } = parameters;

    let itemName = '';
    let description = '';
    const value = requirements.totalCost;

    switch (itemType) {
      case 'scroll':
        itemName = `Scroll of ${parameters.spellsToScribe?.join(', ') || 'Unknown Spell'}`;
        description = 'A magical scroll';
        break;

      case 'potion':
        itemName = `Potion of ${potionType || 'Healing'}`;
        description = 'A magical potion';
        break;

      case 'weapon':
        itemName = `+${enchantmentLevel} Weapon`;
        description = `A weapon enchanted with a +${enchantmentLevel} magical bonus`;
        break;

      case 'armor':
        itemName = `+${enchantmentLevel} Armor`;
        description = `Armor enchanted with a +${enchantmentLevel} magical bonus`;
        break;

      default:
        itemName = `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} of Power`;
        description = `A magical ${itemType}`;
    }

    return {
      id: `${itemType}-${Date.now()}`,
      name: itemName,
      description,
      weight: this.getItemWeight(itemType),
      value,
      equipped: false,
      magicBonus: ['weapon', 'armor'].includes(itemType) ? enchantmentLevel : null,
      charges: itemType === 'wand' ? 50 : null,
    };
  }

  private getItemWeight(itemType: string): number {
    const weights: Record<string, number> = {
      scroll: 0.1,
      potion: 0.5,
      weapon: 3.0,
      armor: 30.0,
      ring: 0.1,
      wand: 1.0,
      rod: 2.0,
      staff: 4.0,
      miscellaneous: 1.0,
    };

    return weights[itemType] || 1.0;
  }

  private updateCharacterAfterCreation(
    character: Character,
    parameters: MagicItemCreationParameters,
    requirements: { totalCost: number },
    item: Item | null,
    success: boolean
  ): Character {
    const goldCost = success ? requirements.totalCost : Math.floor(requirements.totalCost * 0.75);

    const updatedCharacter = {
      ...character,
      currency: {
        ...character.currency,
        gold: Math.max(0, character.currency.gold - goldCost),
      },
    };

    if (success && item && !parameters.baseItemId) {
      updatedCharacter.inventory = [...updatedCharacter.inventory, item];
    }

    return updatedCharacter;
  }
}

export default MagicItemCreationRules;
