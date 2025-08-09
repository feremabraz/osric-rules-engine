/**
 * Treasure Generation Rules for OSRIC
 * Handles generation of treasure based on monster treasure types and adventure context
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';

import { DiceEngine } from '../../core/Dice';
import type { Monster } from '../../entities/Monster';

interface TreasureContext {
  monster: Monster;
  treasureType: string;
  partyLevel: number;
  encounterDifficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  environmentType: 'dungeon' | 'wilderness' | 'lair' | 'hoard';
}

interface GeneratedTreasure {
  coins: {
    copper: number;
    silver: number;
    electrum: number;
    gold: number;
    platinum: number;
  };
  gems: Array<{
    value: number;
    description: string;
    quantity: number;
  }>;
  jewelry: Array<{
    value: number;
    description: string;
    quantity: number;
  }>;
  magicItems: Array<{
    type: string;
    name: string;
    description: string;
    rarity: string;
  }>;
  totalValue: number;
}

interface TreasureTable {
  coinChances: Record<string, number>;
  gemChances: Record<string, number>;
  jewelryChances: Record<string, number>;
  magicItemChances: Record<string, number>;
}

export class TreasureGenerationRule extends BaseRule {
  readonly name = 'treasure-generation';
  readonly priority = 150; // After monster generation, before final results

  // OSRIC treasure type tables (simplified version)
  private readonly treasureTables: Record<string, TreasureTable> = {
    A: {
      coinChances: { copper: 25, silver: 30, electrum: 20, gold: 35, platinum: 25 },
      gemChances: { gems: 50 },
      jewelryChances: { jewelry: 50 },
      magicItemChances: { any: 30 },
    },
    B: {
      coinChances: { copper: 50, silver: 25, electrum: 25, gold: 25, platinum: 0 },
      gemChances: { gems: 25 },
      jewelryChances: { jewelry: 25 },
      magicItemChances: { any: 10 },
    },
    C: {
      coinChances: { copper: 20, silver: 30, electrum: 10, gold: 0, platinum: 0 },
      gemChances: { gems: 20 },
      jewelryChances: { jewelry: 10 },
      magicItemChances: { any: 10 },
    },
    D: {
      coinChances: { copper: 10, silver: 15, electrum: 0, gold: 50, platinum: 0 },
      gemChances: { gems: 30 },
      jewelryChances: { jewelry: 30 },
      magicItemChances: { any: 15 },
    },
    // Add more treasure types as needed
  };

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      // Get treasure generation context
      const treasureContext = this.getRequiredContext<TreasureContext>(
        context,
        'npc:treasure-generation:context'
      );

      // Generate treasure based on treasure type
      const generatedTreasure = this.generateTreasure(treasureContext);

      // Store treasure results
      this.setContext(context, 'npc:treasure-generation:result', generatedTreasure);

      const treasureSummary = this.createTreasureSummary(generatedTreasure);

      return this.createSuccessResult(`Generated treasure for ${treasureContext.monster.name}`, {
        treasure: generatedTreasure,
        treasureType: treasureContext.treasureType,
        totalValue: generatedTreasure.totalValue,
        summary: treasureSummary,
        effects: [treasureSummary],
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to generate treasure: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    // Applies to monster generation and treasure commands
    if (!['monster-generation', 'treasure-generation'].includes(command.type)) {
      return false;
    }

    // Must have treasure generation context
    const treasureContext = this.getOptionalContext<TreasureContext>(
      context,
      'npc:treasure-generation:context'
    );

    return treasureContext !== null && treasureContext.treasureType !== 'Nil';
  }

  getPrerequisites(): string[] {
    return ['monster-stats']; // Monster must be generated first
  }

  /**
   * Generate treasure based on context
   */
  private generateTreasure(context: TreasureContext): GeneratedTreasure {
    const treasureType = context.treasureType.toUpperCase();
    const table = this.treasureTables[treasureType];

    if (!table) {
      // Unknown treasure type, return minimal treasure
      return this.generateMinimalTreasure(context);
    }

    const treasure: GeneratedTreasure = {
      coins: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
      gems: [],
      jewelry: [],
      magicItems: [],
      totalValue: 0,
    };

    // Generate coins
    this.generateCoins(treasure, table, context);

    // Generate gems
    this.generateGems(treasure, table, context);

    // Generate jewelry
    this.generateJewelry(treasure, table, context);

    // Generate magic items
    this.generateMagicItems(treasure, table, context);

    // Calculate total value
    treasure.totalValue = this.calculateTotalValue(treasure);

    return treasure;
  }

  /**
   * Generate coins for treasure
   */
  private generateCoins(
    treasure: GeneratedTreasure,
    table: TreasureTable,
    context: TreasureContext
  ): void {
    const levelMultiplier = Math.max(1, context.partyLevel / 3);

    // Generate each coin type based on chances
    if (DiceEngine.rollPercentile().total <= table.coinChances.copper) {
      treasure.coins.copper = Math.floor(DiceEngine.roll('3d6').total * 100 * levelMultiplier);
    }

    if (DiceEngine.rollPercentile().total <= table.coinChances.silver) {
      treasure.coins.silver = Math.floor(DiceEngine.roll('2d6').total * 100 * levelMultiplier);
    }

    if (DiceEngine.rollPercentile().total <= table.coinChances.electrum) {
      treasure.coins.electrum = Math.floor(DiceEngine.roll('1d6').total * 100 * levelMultiplier);
    }

    if (DiceEngine.rollPercentile().total <= table.coinChances.gold) {
      treasure.coins.gold = Math.floor(DiceEngine.roll('2d8').total * 10 * levelMultiplier);
    }

    if (DiceEngine.rollPercentile().total <= table.coinChances.platinum) {
      treasure.coins.platinum = Math.floor(DiceEngine.roll('1d4').total * 10 * levelMultiplier);
    }
  }

  /**
   * Generate gems for treasure
   */
  private generateGems(
    treasure: GeneratedTreasure,
    table: TreasureTable,
    context: TreasureContext
  ): void {
    if (DiceEngine.rollPercentile().total <= (table.gemChances.gems || 0)) {
      const numGems = DiceEngine.roll('1d4').total;

      for (let i = 0; i < numGems; i++) {
        const gemValue = this.generateGemValue(context.partyLevel);
        const gemDescription = this.getGemDescription(gemValue);

        treasure.gems.push({
          value: gemValue,
          description: gemDescription,
          quantity: 1,
        });
      }
    }
  }

  /**
   * Generate jewelry for treasure
   */
  private generateJewelry(
    treasure: GeneratedTreasure,
    table: TreasureTable,
    context: TreasureContext
  ): void {
    if (DiceEngine.rollPercentile().total <= (table.jewelryChances.jewelry || 0)) {
      const numJewelry = DiceEngine.roll('1d3').total;

      for (let i = 0; i < numJewelry; i++) {
        const jewelryValue = this.generateJewelryValue(context.partyLevel);
        const jewelryDescription = this.getJewelryDescription(jewelryValue);

        treasure.jewelry.push({
          value: jewelryValue,
          description: jewelryDescription,
          quantity: 1,
        });
      }
    }
  }

  /**
   * Generate magic items for treasure
   */
  private generateMagicItems(
    treasure: GeneratedTreasure,
    table: TreasureTable,
    context: TreasureContext
  ): void {
    if (DiceEngine.rollPercentile().total <= (table.magicItemChances.any || 0)) {
      const numItems = DiceEngine.roll('1d2').total;

      for (let i = 0; i < numItems; i++) {
        const magicItem = this.generateMagicItem(context.partyLevel);
        treasure.magicItems.push(magicItem);
      }
    }
  }

  /**
   * Generate gem value based on party level
   */
  private generateGemValue(partyLevel: number): number {
    const baseValues = [10, 50, 100, 500, 1000, 5000];
    const levelIndex = Math.min(Math.floor(partyLevel / 2), baseValues.length - 1);
    const baseValue = baseValues[levelIndex];

    // Add some randomness
    const multiplier = DiceEngine.roll('1d4').total / 2;
    return Math.floor(baseValue * multiplier);
  }

  /**
   * Get gem description based on value
   */
  private getGemDescription(value: number): string {
    if (value >= 5000) return 'Exceptional precious stone (diamond, ruby, emerald)';
    if (value >= 1000) return 'Large precious stone (sapphire, pearl, opal)';
    if (value >= 500) return 'Fine gemstone (garnet, jade, topaz)';
    if (value >= 100) return 'Semi-precious stone (amethyst, citrine, jasper)';
    if (value >= 50) return 'Small gemstone (agate, quartz, turquoise)';
    return 'Ornamental stone (bloodstone, obsidian, malachite)';
  }

  /**
   * Generate jewelry value based on party level
   */
  private generateJewelryValue(partyLevel: number): number {
    const baseValues = [50, 100, 500, 1000, 2500, 10000];
    const levelIndex = Math.min(Math.floor(partyLevel / 2), baseValues.length - 1);
    const baseValue = baseValues[levelIndex];

    // Add some randomness
    const multiplier = DiceEngine.roll('1d6').total / 3;
    return Math.floor(baseValue * multiplier);
  }

  /**
   * Get jewelry description based on value
   */
  private getJewelryDescription(value: number): string {
    if (value >= 10000) return 'Masterwork royal regalia (crown, scepter, royal necklace)';
    if (value >= 2500) return 'Elaborate noble jewelry (golden circlet, jeweled bracelet)';
    if (value >= 1000) return 'Fine jewelry (silver necklace, golden ring, jeweled brooch)';
    if (value >= 500) return 'Quality jewelry (silver bracelet, decorated ring)';
    if (value >= 100) return 'Common jewelry (brass ring, copper bracelet, simple necklace)';
    return 'Simple ornament (leather bracelet, wooden pendant)';
  }

  /**
   * Generate magic item based on party level
   */
  private generateMagicItem(partyLevel: number): {
    type: string;
    name: string;
    description: string;
    rarity: string;
  } {
    const rarity = this.determineMagicItemRarity(partyLevel);
    const type = this.determineMagicItemType();

    return {
      type,
      name: `${rarity} ${type}`,
      description: `A ${rarity.toLowerCase()} magical ${type.toLowerCase()}`,
      rarity,
    };
  }

  /**
   * Determine magic item rarity based on party level
   */
  private determineMagicItemRarity(partyLevel: number): string {
    const roll = DiceEngine.rollPercentile().total;

    if (partyLevel <= 3) {
      return roll <= 85 ? 'Common' : 'Uncommon';
    }

    if (partyLevel <= 6) {
      if (roll <= 50) return 'Common';
      if (roll <= 85) return 'Uncommon';
      return 'Rare';
    }

    if (partyLevel <= 10) {
      if (roll <= 25) return 'Uncommon';
      if (roll <= 75) return 'Rare';
      return 'Very Rare';
    }

    // High level parties (11+)
    if (roll <= 30) return 'Rare';
    if (roll <= 75) return 'Very Rare';
    return 'Legendary';
  }

  /**
   * Determine magic item type
   */
  private determineMagicItemType(): string {
    const types = [
      'Weapon',
      'Armor',
      'Potion',
      'Scroll',
      'Ring',
      'Wand',
      'Rod',
      'Staff',
      'Wondrous Item',
    ];
    const roll = DiceEngine.roll(`1d${types.length}`).total - 1;
    return types[roll];
  }

  /**
   * Calculate total treasure value in gold pieces
   */
  private calculateTotalValue(treasure: GeneratedTreasure): number {
    let total = 0;

    // Convert coins to gold value
    total += treasure.coins.copper / 100;
    total += treasure.coins.silver / 10;
    total += treasure.coins.electrum / 2;
    total += treasure.coins.gold;
    total += treasure.coins.platinum * 5;

    // Add gem values
    total += treasure.gems.reduce((sum, gem) => sum + gem.value * gem.quantity, 0);

    // Add jewelry values
    total += treasure.jewelry.reduce((sum, jewelry) => sum + jewelry.value * jewelry.quantity, 0);

    // Magic items have estimated values (simplified)
    total += treasure.magicItems.length * 1000; // Rough estimate

    return Math.floor(total);
  }

  /**
   * Generate minimal treasure for unknown treasure types
   */
  private generateMinimalTreasure(_context: TreasureContext): GeneratedTreasure {
    const copperAmount = DiceEngine.roll('2d6').total * 10;

    return {
      coins: { copper: copperAmount, silver: 0, electrum: 0, gold: 0, platinum: 0 },
      gems: [],
      jewelry: [],
      magicItems: [],
      totalValue: copperAmount / 100,
    };
  }

  /**
   * Create human-readable treasure summary
   */
  private createTreasureSummary(treasure: GeneratedTreasure): string {
    const parts: string[] = [];

    // Summarize coins
    const coins: string[] = [];
    if (treasure.coins.platinum > 0) coins.push(`${treasure.coins.platinum} pp`);
    if (treasure.coins.gold > 0) coins.push(`${treasure.coins.gold} gp`);
    if (treasure.coins.electrum > 0) coins.push(`${treasure.coins.electrum} ep`);
    if (treasure.coins.silver > 0) coins.push(`${treasure.coins.silver} sp`);
    if (treasure.coins.copper > 0) coins.push(`${treasure.coins.copper} cp`);

    if (coins.length > 0) {
      parts.push(`Coins: ${coins.join(', ')}`);
    }

    if (treasure.gems.length > 0) {
      parts.push(`${treasure.gems.length} gems`);
    }

    if (treasure.jewelry.length > 0) {
      parts.push(`${treasure.jewelry.length} jewelry items`);
    }

    if (treasure.magicItems.length > 0) {
      parts.push(`${treasure.magicItems.length} magic items`);
    }

    const summary = parts.length > 0 ? parts.join(', ') : 'No treasure';
    return `Treasure (${treasure.totalValue} gp total): ${summary}`;
  }
}
