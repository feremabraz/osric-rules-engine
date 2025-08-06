import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import type { Character, Item } from '@osric/types/entities';

interface MaterialRequirement {
  name: string;
  cost: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
  quantity: number;
  consumed: boolean;
}

export interface EnchantmentContext {
  enchanter: Character;
  targetItem: Item;
  enchantmentLevel: number;
  enchantmentType: 'weapon' | 'armor' | 'shield' | 'miscellaneous';
  specialProperties?: string[];
  materialComponents: {
    name: string;
    cost: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
    consumed: boolean;
  }[];
  workspaceQuality: 'basic' | 'good' | 'excellent' | 'legendary';
  ritualDuration: number;
}

export class EnchantmentRules extends BaseRule {
  readonly name = RULE_NAMES.ENCHANTMENT_RULES;
  readonly priority = 100;

  async execute(_context: GameContext, command: Command): Promise<RuleResult> {
    const enchantmentContext = this.extractEnchantmentContext(command);
    if (!enchantmentContext) {
      return this.createFailureResult('Invalid enchantment context', {});
    }

    try {
      const validation = this.validateEnchanter(enchantmentContext.enchanter, enchantmentContext);
      if (!validation.success) {
        return this.createFailureResult(validation.reason, {
          enchanter: enchantmentContext.enchanter.name,
          issue: validation.reason,
        });
      }

      const requirements = this.calculateEnchantmentRequirements(enchantmentContext);

      const requirementCheck = this.checkRequirements(enchantmentContext.enchanter, requirements);
      if (!requirementCheck.success) {
        return this.createFailureResult(requirementCheck.reason, {
          missingRequirements: requirementCheck.missing,
        });
      }

      const enchantmentResult = this.performEnchantment(enchantmentContext, requirements);

      if (enchantmentResult.success) {
        const enchantedItem = this.applyEnchantment(
          enchantmentContext.targetItem,
          enchantmentContext.enchantmentLevel,
          enchantmentContext.specialProperties || []
        );

        return this.createSuccessResult(
          `Successfully enchanted ${enchantedItem.name} with +${enchantmentContext.enchantmentLevel} enchantment`,
          {
            enchantedItem,
            timeSpent: requirements.ritualTime,
            materialsConsumed: requirements.materialsRequired,
            powerInfused: enchantmentResult.powerLevel,
          }
        );
      }

      return this.createFailureResult(`Enchantment failed: ${enchantmentResult.reason}`, {
        itemDamaged: enchantmentResult.itemDestroyed,
        materialsLost: enchantmentResult.materialsLost,
        timeWasted: requirements.ritualTime,
      });
    } catch (error: unknown) {
      return this.createFailureResult(
        `Error during enchantment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === 'enchantment' || command.type === 'magic-item-creation';
  }

  private extractEnchantmentContext(_command: Command): EnchantmentContext | null {
    return null;
  }

  private validateEnchanter(
    enchanter: Character,
    context: EnchantmentContext
  ): { success: boolean; reason: string } {
    const magicUserLevel = enchanter.classes['Magic-User'];
    const clericLevel = enchanter.classes.Cleric;

    if (!magicUserLevel && !clericLevel) {
      return {
        success: false,
        reason: 'Only Magic-Users and Clerics can perform enchantments',
      };
    }

    const minLevelRequired = 5 + (context.enchantmentLevel - 1) * 2;
    const characterLevel = Math.max(magicUserLevel || 0, clericLevel || 0);

    if (characterLevel < minLevelRequired) {
      return {
        success: false,
        reason: `Minimum level ${minLevelRequired} required for +${context.enchantmentLevel} enchantment`,
      };
    }

    if (context.enchantmentLevel > 2 && enchanter.abilities.intelligence < 15) {
      return {
        success: false,
        reason: 'Intelligence 15+ required for +3 or higher enchantments',
      };
    }

    const requiredSpells = this.getRequiredSpells(
      context.enchantmentType,
      context.enchantmentLevel
    );
    const knownSpells = enchanter.spells.map((spell) => spell.name);
    const missingSpells = requiredSpells.filter((spell) => !knownSpells.includes(spell));

    if (missingSpells.length > 0) {
      return {
        success: false,
        reason: `Missing required spells: ${missingSpells.join(', ')}`,
      };
    }

    return { success: true, reason: '' };
  }

  private calculateEnchantmentRequirements(context: EnchantmentContext) {
    const { enchantmentLevel, enchantmentType, workspaceQuality } = context;

    const baseTime = enchantmentLevel * enchantmentLevel * 10;

    const qualityModifiers = {
      basic: { time: 1.0, success: 0.4 },
      good: { time: 0.9, success: 0.6 },
      excellent: { time: 0.8, success: 0.75 },
      legendary: { time: 0.7, success: 0.9 },
    };

    const modifier = qualityModifiers[workspaceQuality];
    const ritualTime = Math.ceil(baseTime * modifier.time);

    const materialsRequired = this.calculateMaterialRequirements(enchantmentType, enchantmentLevel);

    let baseSuccessChance = modifier.success;

    const typeModifiers = {
      weapon: 0.0,
      armor: -0.1,
      shield: -0.05,
      miscellaneous: -0.2,
    };

    baseSuccessChance += typeModifiers[enchantmentType];

    baseSuccessChance -= (enchantmentLevel - 1) * 0.1;

    return {
      ritualTime,
      materialsRequired,
      baseSuccessChance: Math.max(0.1, Math.min(0.95, baseSuccessChance)),
    };
  }

  private getRequiredSpells(enchantmentType: string, enchantmentLevel: number): string[] {
    const baseSpells = {
      weapon: ['Enchant Weapon', 'Permanency'],
      armor: ['Enchant Armor', 'Permanency'],
      shield: ['Shield', 'Enchant Armor', 'Permanency'],
      miscellaneous: ['Enchant an Item', 'Permanency'],
    };

    const spells =
      baseSpells[enchantmentType as keyof typeof baseSpells] || baseSpells.miscellaneous;

    if (enchantmentLevel >= 3) {
      spells.push('Limited Wish');
    }
    if (enchantmentLevel >= 5) {
      spells.push('Wish');
    }

    return spells;
  }

  private calculateMaterialRequirements(enchantmentType: string, enchantmentLevel: number) {
    const baseMaterials = {
      weapon: [
        { name: 'Powdered Silver', cost: 100, rarity: 'common' as const },
        { name: 'Blessed Oil', cost: 50, rarity: 'common' as const },
        { name: 'Iron Filings', cost: 25, rarity: 'common' as const },
      ],
      armor: [
        { name: 'Mithril Dust', cost: 200, rarity: 'uncommon' as const },
        { name: 'Holy Water', cost: 25, rarity: 'common' as const },
        { name: 'Adamantine Shavings', cost: 150, rarity: 'uncommon' as const },
      ],
      shield: [
        { name: 'Silver Leaf', cost: 75, rarity: 'common' as const },
        { name: 'Protective Wards', cost: 100, rarity: 'uncommon' as const },
      ],
      miscellaneous: [
        { name: 'Rare Earth Elements', cost: 300, rarity: 'rare' as const },
        { name: 'Elemental Essence', cost: 500, rarity: 'rare' as const },
      ],
    };

    const materials =
      baseMaterials[enchantmentType as keyof typeof baseMaterials] || baseMaterials.miscellaneous;

    return materials.map((material) => ({
      ...material,
      cost: material.cost * enchantmentLevel * enchantmentLevel,
      quantity: enchantmentLevel,
      consumed: true,
    }));
  }

  private checkRequirements(
    enchanter: Character,
    requirements: {
      ritualTime: number;
      materialsRequired: MaterialRequirement[];
      baseSuccessChance: number;
    }
  ): { success: boolean; reason: string; missing?: string[] } {
    const missing: string[] = [];

    const totalCost = requirements.materialsRequired.reduce(
      (sum, material) => sum + material.cost * material.quantity,
      0
    );

    if (enchanter.currency.gold < totalCost) {
      missing.push(`${totalCost - enchanter.currency.gold} additional gold pieces`);
    }

    if (missing.length > 0) {
      return {
        success: false,
        reason: `Insufficient resources: ${missing.join(', ')}`,
        missing,
      };
    }

    return { success: true, reason: '' };
  }

  private performEnchantment(
    context: EnchantmentContext,
    requirements: { baseSuccessChance: number; materialsRequired: MaterialRequirement[] }
  ): {
    success: boolean;
    reason: string;
    powerLevel?: number;
    itemDestroyed?: boolean;
    materialsLost?: string[];
  } {
    const roll = Math.random();
    const success = roll <= requirements.baseSuccessChance;

    if (success) {
      const powerRoll = Math.random();
      let powerLevel = context.enchantmentLevel;

      if (powerRoll >= 0.95) {
        powerLevel += 1;
      }

      return {
        success: true,
        reason: 'Enchantment ritual completed successfully',
        powerLevel,
      };
    }

    const failureRoll = Math.random();
    let itemDestroyed = false;
    let materialsLost: string[] = [];

    if (failureRoll <= 0.1) {
      itemDestroyed = true;
      materialsLost = requirements.materialsRequired.map((m) => m.name);
    } else {
      materialsLost = requirements.materialsRequired.filter((m) => m.consumed).map((m) => m.name);
    }

    const failureReasons = [
      'Magical energies dissipated during the ritual',
      'Incompatible magical resonance between enchanter and item',
      'Insufficient focus during critical enchantment phase',
      'Material components were improperly prepared',
    ];

    return {
      success: false,
      reason: failureReasons[Math.floor(Math.random() * failureReasons.length)],
      itemDestroyed,
      materialsLost,
    };
  }

  private applyEnchantment(
    item: Item,
    enchantmentLevel: number,
    specialProperties: string[]
  ): Item {
    const enchantedItem = {
      ...item,
      name: `${item.name} +${enchantmentLevel}`,
      magicBonus: enchantmentLevel,
      value: item.value + 1000 * enchantmentLevel * enchantmentLevel,
      description: `${item.description} This item has been magically enchanted with a +${enchantmentLevel} bonus.`,
    };

    if (specialProperties.length > 0) {
      enchantedItem.description += ` Special properties: ${specialProperties.join(', ')}.`;
    }

    return enchantedItem;
  }
}
