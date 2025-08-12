import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface TreasureHoard {
  copperPieces: number;
  silverPieces: number;
  electrumPieces: number;
  goldPieces: number;
  platinumPieces: number;
  gems: TreasureGem[];
  jewelry: TreasureJewelry[];
  magicItems: MagicItem[];
  totalValue: number;
}

export interface TreasureGem {
  type: string;
  value: number;
  description: string;
}

export interface TreasureJewelry {
  type: string;
  value: number;
  description: string;
}

export interface MagicItem {
  name: string;
  type:
    | 'weapon'
    | 'armor'
    | 'potion'
    | 'scroll'
    | 'wand'
    | 'ring'
    | 'rod'
    | 'staff'
    | 'miscellaneous';
  bonus?: number;
  charges?: number;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact';
}

export interface TreasureContext {
  treasureType: string;
  monsterHitDice: number;
  numberAppearing: number;
  environment: string;
  partyLevel: number;
}

export class TreasureGenerationRules extends BaseRule {
  readonly name = RULE_NAMES.TREASURE_GENERATION;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.MONSTER_GENERATION;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const treasureContext = this.getOptionalContext<TreasureContext>(context, 'treasureContext');

    if (!treasureContext) {
      return this.createFailureResult('No treasure context provided');
    }

    try {
      const treasure = this.generateTreasure(treasureContext);

      this.setContext(context, 'treasureHoard', treasure);

      return this.createSuccessResult(`Generated treasure hoard worth ${treasure.totalValue} gp`, {
        treasure,
        treasureDescription: this.describeTreasure(treasure),
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to generate treasure: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateTreasure(context: TreasureContext): TreasureHoard {
    const treasure: TreasureHoard = {
      copperPieces: 0,
      silverPieces: 0,
      electrumPieces: 0,
      goldPieces: 0,
      platinumPieces: 0,
      gems: [],
      jewelry: [],
      magicItems: [],
      totalValue: 0,
    };

    this.generateCoins(treasure, context.treasureType, context.numberAppearing);

    this.generateGems(treasure, context.treasureType, context.monsterHitDice);

    this.generateJewelry(treasure, context.treasureType, context.monsterHitDice);

    this.generateMagicItems(treasure, context);

    treasure.totalValue = this.calculateTotalValue(treasure);

    return treasure;
  }

  private generateCoins(
    treasure: TreasureHoard,
    treasureType: string,
    numberAppearing: number
  ): void {
    const multiplier = Math.max(1, Math.floor(numberAppearing / 10));

    switch (treasureType.toUpperCase()) {
      case 'A':
        treasure.copperPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        treasure.goldPieces = DiceEngine.roll('3d6').total * 1000 * multiplier;
        treasure.platinumPieces = DiceEngine.roll('1d6').total * 100 * multiplier;
        break;

      case 'B':
        treasure.copperPieces = DiceEngine.roll('1d8').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d4').total * 1000 * multiplier;
        treasure.goldPieces = DiceEngine.roll('1d3').total * 1000 * multiplier;
        break;

      case 'C':
        treasure.copperPieces = DiceEngine.roll('1d12').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d4').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d4').total * 1000 * multiplier;
        break;

      case 'D':
        treasure.copperPieces = DiceEngine.roll('1d8').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d12').total * 1000 * multiplier;
        treasure.goldPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        break;

      case 'E':
        treasure.copperPieces = DiceEngine.roll('1d10').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d12').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d6').total * 1000 * multiplier;
        treasure.goldPieces = DiceEngine.roll('1d8').total * 1000 * multiplier;
        break;

      case 'F':
        treasure.silverPieces = DiceEngine.roll('2d10').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d8').total * 1000 * multiplier;
        treasure.goldPieces = DiceEngine.roll('1d12').total * 1000 * multiplier;
        break;

      case 'G':
        treasure.goldPieces = DiceEngine.roll('10d4').total * 100 * multiplier;
        treasure.platinumPieces = DiceEngine.roll('1d6').total * 10 * multiplier;
        break;

      case 'H':
        treasure.copperPieces = DiceEngine.roll('3d8').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d100').total * 100 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d4').total * 10 * multiplier;
        treasure.goldPieces = DiceEngine.roll('1d6').total * 100 * multiplier;
        break;

      default:
        treasure.copperPieces = DiceEngine.roll('1d12').total * 1000 * multiplier;
        treasure.silverPieces = DiceEngine.roll('1d4').total * 1000 * multiplier;
        treasure.electrumPieces = DiceEngine.roll('1d4').total * 1000 * multiplier;
    }
  }

  private generateGems(treasure: TreasureHoard, treasureType: string, hitDice: number): void {
    let gemChance = 0;
    let gemCount = 0;

    switch (treasureType.toUpperCase()) {
      case 'A':
        gemChance = 60;
        gemCount = DiceEngine.roll('3d6').total;
        break;
      case 'B':
        gemChance = 50;
        gemCount = DiceEngine.roll('1d8').total;
        break;
      case 'C':
        gemChance = 25;
        gemCount = DiceEngine.roll('1d6').total;
        break;
      case 'D':
        gemChance = 30;
        gemCount = DiceEngine.roll('1d8').total;
        break;
      case 'E':
        gemChance = 10;
        gemCount = DiceEngine.roll('1d4').total;
        break;
      case 'F':
        gemChance = 20;
        gemCount = DiceEngine.roll('1d12').total;
        break;
      case 'G':
        gemChance = 35;
        gemCount = DiceEngine.roll('3d6').total;
        break;
      case 'H':
        gemChance = 15;
        gemCount = DiceEngine.roll('1d6').total;
        break;
    }

    if (DiceEngine.roll('1d100').total <= gemChance) {
      for (let i = 0; i < gemCount; i++) {
        treasure.gems.push(this.generateGem(hitDice));
      }
    }
  }

  private generateGem(hitDice: number): TreasureGem {
    const gemTypes = [
      {
        name: 'Ornamental stones',
        baseValue: 10,
        descriptions: [
          'agate',
          'azurite',
          'bloodstone',
          'carnelian',
          'chalcedony',
          'chrysoprase',
          'citrine',
          'hematite',
          'jasper',
          'lapis lazuli',
          'malachite',
          'moonstone',
          'obsidian',
          'onyx',
          'quartz',
          'rhodochrosite',
          'tiger eye',
          'turquoise',
        ],
      },
      {
        name: 'Semi-precious stones',
        baseValue: 50,
        descriptions: [
          'amber',
          'amethyst',
          'andalusite',
          'beryl',
          'coral',
          'garnet',
          'ivory',
          'jade',
          'jet',
          'pearl',
          'peridot',
          'spinel',
          'tourmaline',
          'zircon',
        ],
      },
      {
        name: 'Fancy stones',
        baseValue: 100,
        descriptions: ['alexandrite', 'aquamarine', 'black pearl', 'topaz'],
      },
      {
        name: 'Precious stones',
        baseValue: 500,
        descriptions: ['diamond', 'emerald', 'opal', 'ruby', 'sapphire'],
      },
      {
        name: 'Gem stones',
        baseValue: 1000,
        descriptions: ['black opal', 'diamond', 'emerald', 'jacinth', 'ruby', 'sapphire'],
      },
    ];

    let typeIndex = Math.min(gemTypes.length - 1, Math.floor(hitDice / 3));
    if (DiceEngine.roll('1d100').total <= 10 + hitDice) {
      typeIndex = Math.min(gemTypes.length - 1, typeIndex + 1);
    }

    const gemType = gemTypes[typeIndex];
    const description =
      gemType.descriptions[DiceEngine.roll(`1d${gemType.descriptions.length}`).total - 1];

    const valueMod = DiceEngine.roll('1d100').total;
    let value = gemType.baseValue;
    if (valueMod <= 10) {
      value = Math.floor(value * 0.5);
    } else if (valueMod >= 90) {
      value = Math.floor(value * 1.5);
    }

    return {
      type: gemType.name,
      value,
      description: `${description} worth ${value} gp`,
    };
  }

  private generateJewelry(treasure: TreasureHoard, treasureType: string, hitDice: number): void {
    let jewelryChance = 0;
    let jewelryCount = 0;

    switch (treasureType.toUpperCase()) {
      case 'A':
        jewelryChance = 40;
        jewelryCount = DiceEngine.roll('1d10').total;
        break;
      case 'B':
        jewelryChance = 25;
        jewelryCount = DiceEngine.roll('1d6').total;
        break;
      case 'C':
        jewelryChance = 15;
        jewelryCount = DiceEngine.roll('1d4').total;
        break;
      case 'D':
        jewelryChance = 20;
        jewelryCount = DiceEngine.roll('1d6').total;
        break;
      case 'E':
        jewelryChance = 5;
        jewelryCount = DiceEngine.roll('1d4').total;
        break;
      case 'F':
        jewelryChance = 10;
        jewelryCount = DiceEngine.roll('1d8').total;
        break;
      case 'G':
        jewelryChance = 25;
        jewelryCount = DiceEngine.roll('1d10').total;
        break;
      case 'H':
        jewelryChance = 10;
        jewelryCount = DiceEngine.roll('1d4').total;
        break;
    }

    if (DiceEngine.roll('1d100').total <= jewelryChance) {
      for (let i = 0; i < jewelryCount; i++) {
        treasure.jewelry.push(this.generateJewelryItem(hitDice));
      }
    }
  }

  private generateJewelryItem(hitDice: number): TreasureJewelry {
    const jewelryTypes = [
      'anklet',
      'armband',
      'belt',
      'bracelet',
      'brooch',
      'buckle',
      'chain',
      'circlet',
      'clasp',
      'collar',
      'crown',
      'earring',
      'fillet',
      'locket',
      'necklace',
      'pendant',
      'pin',
      'ring',
      'scepter',
      'tiara',
      'torc',
    ];

    const materials = [
      { name: 'silver', multiplier: 1 },
      { name: 'electrum', multiplier: 2.5 },
      { name: 'gold', multiplier: 5 },
      { name: 'platinum', multiplier: 10 },
    ];

    const jewelryType = jewelryTypes[DiceEngine.roll(`1d${jewelryTypes.length}`).total - 1];

    let materialIndex = Math.max(0, Math.min(materials.length - 1, Math.floor(hitDice / 4)));
    if (DiceEngine.roll('1d20').total <= hitDice) {
      materialIndex = Math.min(materials.length - 1, materialIndex + 1);
    }

    const material = materials[materialIndex];
    const baseValue = DiceEngine.roll('3d6').total * 100;
    const value = Math.floor(baseValue * material.multiplier);

    return {
      type: jewelryType,
      value,
      description: `${material.name} ${jewelryType} worth ${value} gp`,
    };
  }

  private generateMagicItems(treasure: TreasureHoard, context: TreasureContext): void {
    let magicChance = 0;
    let magicCount = 0;

    switch (context.treasureType.toUpperCase()) {
      case 'A':
        magicChance = 30;
        magicCount = DiceEngine.roll('1d6').total;
        break;
      case 'B':
        magicChance = 25;
        magicCount = DiceEngine.roll('1d4').total;
        break;
      case 'C':
        magicChance = 10;
        magicCount = DiceEngine.roll('1d3').total;
        break;
      case 'D':
        magicChance = 15;
        magicCount = DiceEngine.roll('1d4').total;
        break;
      case 'E':
        magicChance = 25;
        magicCount = DiceEngine.roll('1d6').total;
        break;
      case 'F':
        magicChance = 30;
        magicCount = DiceEngine.roll('1d6').total;
        break;
      case 'G':
        magicChance = 35;
        magicCount = DiceEngine.roll('1d8').total;
        break;
      case 'H':
        magicChance = 15;
        magicCount = DiceEngine.roll('1d4').total;
        break;
    }

    magicChance += Math.floor(context.monsterHitDice / 2);
    magicChance += Math.floor(context.partyLevel / 3);

    if (DiceEngine.roll('1d100').total <= magicChance) {
      for (let i = 0; i < magicCount; i++) {
        treasure.magicItems.push(this.generateMagicItem(context));
      }
    }
  }

  private generateMagicItem(context: TreasureContext): MagicItem {
    const itemTypes: Array<{ type: MagicItem['type']; weight: number }> = [
      { type: 'weapon', weight: 25 },
      { type: 'armor', weight: 20 },
      { type: 'potion', weight: 20 },
      { type: 'scroll', weight: 15 },
      { type: 'ring', weight: 8 },
      { type: 'wand', weight: 5 },
      { type: 'rod', weight: 3 },
      { type: 'staff', weight: 2 },
      { type: 'miscellaneous', weight: 2 },
    ];

    const totalWeight = itemTypes.reduce((sum, item) => sum + item.weight, 0);
    const roll = DiceEngine.roll(`1d${totalWeight}`).total;

    let currentWeight = 0;
    let selectedType = itemTypes[0].type;

    for (const itemType of itemTypes) {
      currentWeight += itemType.weight;
      if (roll <= currentWeight) {
        selectedType = itemType.type;
        break;
      }
    }

    return this.createSpecificMagicItem(selectedType, context);
  }

  private createSpecificMagicItem(type: MagicItem['type'], context: TreasureContext): MagicItem {
    const rarityRoll = DiceEngine.roll('1d100').total + context.monsterHitDice + context.partyLevel;
    let rarity: MagicItem['rarity'] = 'common';

    if (rarityRoll >= 150) rarity = 'artifact';
    else if (rarityRoll >= 120) rarity = 'legendary';
    else if (rarityRoll >= 90) rarity = 'very-rare';
    else if (rarityRoll >= 60) rarity = 'rare';
    else if (rarityRoll >= 30) rarity = 'uncommon';

    switch (type) {
      case 'weapon':
        return this.createMagicWeapon(rarity);
      case 'armor':
        return this.createMagicArmor(rarity);
      case 'potion':
        return this.createMagicPotion(rarity);
      case 'scroll':
        return this.createMagicScroll(rarity);
      case 'ring':
        return this.createMagicRing(rarity);
      case 'wand':
        return this.createMagicWand(rarity);
      case 'rod':
        return this.createMagicRod(rarity);
      case 'staff':
        return this.createMagicStaff(rarity);
      default:
        return this.createMiscellaneousMagicItem(rarity);
    }
  }

  private createMagicWeapon(rarity: MagicItem['rarity']): MagicItem {
    const weapons = ['sword', 'dagger', 'mace', 'axe', 'bow', 'spear', 'hammer'];
    const weapon = weapons[DiceEngine.roll(`1d${weapons.length}`).total - 1];

    let bonus = 1;
    if (rarity === 'uncommon') bonus = 2;
    else if (rarity === 'rare') bonus = 3;
    else if (rarity === 'very-rare') bonus = 4;
    else if (rarity === 'legendary') bonus = 5;

    return {
      name: `${weapon} +${bonus}`,
      type: 'weapon',
      bonus,
      description: `A magical ${weapon} with a +${bonus} enhancement bonus`,
      rarity,
    };
  }

  private createMagicArmor(rarity: MagicItem['rarity']): MagicItem {
    const armors = ['leather', 'chain mail', 'scale mail', 'plate mail', 'shield'];
    const armor = armors[DiceEngine.roll(`1d${armors.length}`).total - 1];

    let bonus = 1;
    if (rarity === 'uncommon') bonus = 2;
    else if (rarity === 'rare') bonus = 3;
    else if (rarity === 'very-rare') bonus = 4;
    else if (rarity === 'legendary') bonus = 5;

    return {
      name: `${armor} +${bonus}`,
      type: 'armor',
      bonus,
      description: `Magical ${armor} with a +${bonus} armor class bonus`,
      rarity,
    };
  }

  private createMagicPotion(rarity: MagicItem['rarity']): MagicItem {
    const potions = [
      'healing',
      'strength',
      'invisibility',
      'flying',
      'fire resistance',
      'water breathing',
      'haste',
      'giant strength',
      'extra healing',
    ];
    const potion = potions[DiceEngine.roll(`1d${potions.length}`).total - 1];

    return {
      name: `potion of ${potion}`,
      type: 'potion',
      description: `A magical potion that grants ${potion}`,
      rarity,
    };
  }

  private createMagicScroll(rarity: MagicItem['rarity']): MagicItem {
    const spellLevel =
      rarity === 'common'
        ? 1
        : rarity === 'uncommon'
          ? 2
          : rarity === 'rare'
            ? 3
            : rarity === 'very-rare'
              ? 4
              : 5;

    return {
      name: `scroll of level ${spellLevel} spell`,
      type: 'scroll',
      description: `A scroll containing a ${spellLevel}th level spell`,
      rarity,
    };
  }

  private createMagicRing(rarity: MagicItem['rarity']): MagicItem {
    const rings = [
      'protection',
      'invisibility',
      'fire resistance',
      'water walking',
      'feather falling',
      'spell storing',
      'telekinesis',
      'wishes',
    ];
    const ring = rings[DiceEngine.roll(`1d${rings.length}`).total - 1];

    return {
      name: `ring of ${ring}`,
      type: 'ring',
      description: `A magical ring of ${ring}`,
      rarity,
    };
  }

  private createMagicWand(rarity: MagicItem['rarity']): MagicItem {
    const wands = ['magic missiles', 'lightning bolts', 'fireballs', 'ice storms', 'polymorph'];
    const wand = wands[DiceEngine.roll(`1d${wands.length}`).total - 1];
    const charges = DiceEngine.roll('1d50').total + 10;

    return {
      name: `wand of ${wand}`,
      type: 'wand',
      charges,
      description: `A wand of ${wand} with ${charges} charges`,
      rarity,
    };
  }

  private createMagicRod(rarity: MagicItem['rarity']): MagicItem {
    const rods = ['cancellation', 'lordly might', 'resurrection', 'rulership', 'absorption'];
    const rod = rods[DiceEngine.roll(`1d${rods.length}`).total - 1];

    return {
      name: `rod of ${rod}`,
      type: 'rod',
      description: `A powerful rod of ${rod}`,
      rarity,
    };
  }

  private createMagicStaff(rarity: MagicItem['rarity']): MagicItem {
    const staves = ['power', 'wizardry', 'the magi', 'striking', 'healing'];
    const staff = staves[DiceEngine.roll(`1d${staves.length}`).total - 1];
    const charges = DiceEngine.roll('1d50').total + 20;

    return {
      name: `staff of ${staff}`,
      type: 'staff',
      charges,
      description: `A magical staff of ${staff} with ${charges} charges`,
      rarity,
    };
  }

  private createMiscellaneousMagicItem(rarity: MagicItem['rarity']): MagicItem {
    const items = [
      'bag of holding',
      'boots of speed',
      'cloak of elvenkind',
      'gauntlets of ogre power',
      'rope of climbing',
      'crystal ball',
      'figurine of wondrous power',
      'portable hole',
    ];
    const item = items[DiceEngine.roll(`1d${items.length}`).total - 1];

    return {
      name: item,
      type: 'miscellaneous',
      description: `A magical ${item}`,
      rarity,
    };
  }

  private calculateTotalValue(treasure: TreasureHoard): number {
    let total = 0;

    total += treasure.copperPieces * 0.01;
    total += treasure.silverPieces * 0.1;
    total += treasure.electrumPieces * 0.5;
    total += treasure.goldPieces;
    total += treasure.platinumPieces * 5;

    total += treasure.gems.reduce((sum, gem) => sum + gem.value, 0);

    total += treasure.jewelry.reduce((sum, jewelry) => sum + jewelry.value, 0);

    total += treasure.magicItems.reduce((sum, item) => {
      let value = 0;
      switch (item.rarity) {
        case 'common':
          value = 100;
          break;
        case 'uncommon':
          value = 500;
          break;
        case 'rare':
          value = 2000;
          break;
        case 'very-rare':
          value = 10000;
          break;
        case 'legendary':
          value = 50000;
          break;
        case 'artifact':
          value = 100000;
          break;
      }
      return sum + value;
    }, 0);

    return Math.floor(total);
  }

  private describeTreasure(treasure: TreasureHoard): string {
    const descriptions: string[] = [];

    if (treasure.copperPieces > 0) descriptions.push(`${treasure.copperPieces} copper pieces`);
    if (treasure.silverPieces > 0) descriptions.push(`${treasure.silverPieces} silver pieces`);
    if (treasure.electrumPieces > 0)
      descriptions.push(`${treasure.electrumPieces} electrum pieces`);
    if (treasure.goldPieces > 0) descriptions.push(`${treasure.goldPieces} gold pieces`);
    if (treasure.platinumPieces > 0)
      descriptions.push(`${treasure.platinumPieces} platinum pieces`);

    if (treasure.gems.length > 0) {
      descriptions.push(
        `${treasure.gems.length} gems: ${treasure.gems.map((g) => g.description).join(', ')}`
      );
    }
    if (treasure.jewelry.length > 0) {
      descriptions.push(
        `${treasure.jewelry.length} jewelry items: ${treasure.jewelry.map((j) => j.description).join(', ')}`
      );
    }

    if (treasure.magicItems.length > 0) {
      descriptions.push(
        `${treasure.magicItems.length} magic items: ${treasure.magicItems.map((m) => m.name).join(', ')}`
      );
    }

    return descriptions.join('; ');
  }
}
