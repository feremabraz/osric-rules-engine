import { MagicItemCreationValidator } from '@osric/commands/spells/validators/MagicItemCreationValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';

export interface MagicItemCreationParameters {
  characterId: string | CharacterId;
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

interface CreationRequirements {
  timeInDays: number;
  baseCost: number;
  materialCost: number;
  totalCost: number;
  requiredLevel: number;
  specialRequirements: string[];
  successChance: number;
}

interface CreationResult {
  success: boolean;
  reason: string;
  item?: Item;
  costsIncurred: {
    time: number;
    gold: number;
    materials: string[];
  };
}

export class MagicItemCreationCommand extends BaseCommand<MagicItemCreationParameters> {
  readonly type = COMMAND_TYPES.MAGIC_ITEM_CREATION;
  readonly parameters: MagicItemCreationParameters;

  constructor(
    parameters: MagicItemCreationParameters,
    actorId: EntityId,
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = MagicItemCreationValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, itemType } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult('Character not found', undefined, { characterId });
      }

      const validation = this.validateCreator(character, itemType);
      if (!validation.valid) {
        return this.createFailureResult(validation.reason, undefined, { itemType });
      }

      const requirements = this.calculateCreationRequirements(character, this.parameters);

      const requirementCheck = this.checkRequirements(character, requirements);
      if (!requirementCheck.valid) {
        return this.createFailureResult(requirementCheck.reason, undefined, {
          requirements: requirements,
          missing: requirementCheck.missing,
        });
      }

      const creationResult = this.attemptCreation(character, requirements, this.parameters);

      if (creationResult.success && creationResult.item) {
        const updatedCharacter = this.updateCharacterAfterCreation(
          character,
          requirements,
          creationResult.item,
          true
        );
        context.setEntity(characterId, updatedCharacter);

        return this.createSuccessResult(`Successfully created ${creationResult.item.name}`, {
          item: creationResult.item,
          timeSpent: requirements.timeInDays,
          goldSpent: requirements.totalCost,
          materialsUsed: requirements.specialRequirements,
        });
      }

      const failedCharacter = this.updateCharacterAfterCreation(
        character,
        requirements,
        null,
        false
      );
      context.setEntity(characterId, failedCharacter);

      return this.createFailureResult(
        `Magic item creation failed: ${creationResult.reason}`,
        undefined,
        {
          timeSpent: requirements.timeInDays,
          goldLost: Math.floor(requirements.totalCost * 0.75),
          materialsLost: creationResult.costsIncurred.materials,
        }
      );
    } catch (error: unknown) {
      return this.createFailureResult(
        `Error during magic item creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity<Character>(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.ENCHANTMENT_RULES,
      RULE_NAMES.SCROLL_SCRIBING,
      // No dedicated constant for potion brewing rules yet; covered by magic item rules
      RULE_NAMES.MAGIC_ITEM_RULES,
    ];
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
  ): CreationRequirements {
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
    requirements: CreationRequirements
  ): { valid: boolean; reason: string; missing?: string[] } {
    const missing: string[] = [];

    if (character.currency.gold < requirements.totalCost) {
      missing.push(`${requirements.totalCost - character.currency.gold} gold pieces`);
    }

    const missingMaterials = (this.parameters.materialComponents || [])
      .filter((material) => !material.available)
      .map((material) => material.name);

    if (missingMaterials.length > 0) {
      missing.push(`Materials: ${missingMaterials.join(', ')}`);
    }

    if (this.parameters.itemType === 'scroll' && this.parameters.spellsToScribe) {
      const unknownSpells = this.parameters.spellsToScribe.filter(
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
    character: Character,
    requirements: CreationRequirements,
    parameters: MagicItemCreationParameters
  ): CreationResult {
    const roll = Math.random();
    const success = roll <= requirements.successChance;

    const costsIncurred = {
      time: requirements.timeInDays,
      gold: success ? requirements.totalCost : Math.floor(requirements.totalCost * 0.75),
      materials: requirements.specialRequirements,
    };

    if (!success) {
      const failureReasons = [
        'Magical energy dissipated during the creation process',
        'Materials were not properly aligned during enchantment',
        'Interruption caused the magical binding to fail',
        'Insufficient focus during critical creation phase',
      ];

      return {
        success: false,
        reason: failureReasons[Math.floor(Math.random() * failureReasons.length)],
        costsIncurred,
      };
    }

    const item = this.createMagicItem(character, parameters, requirements);

    return {
      success: true,
      reason: 'Creation successful',
      item,
      costsIncurred,
    };
  }

  private createMagicItem(
    character: Character,
    parameters: MagicItemCreationParameters,
    requirements: CreationRequirements
  ): Item {
    const { itemType, enchantmentLevel = 1, potionType } = parameters;

    let itemName = '';
    let description = '';
    const value = requirements.totalCost;

    switch (itemType) {
      case 'scroll':
        itemName = `Scroll of ${parameters.spellsToScribe?.join(', ') || 'Unknown Spell'}`;
        description = `A magical scroll containing spells scribed by ${character.name}`;
        break;

      case 'potion':
        itemName = `Potion of ${potionType || 'Healing'}`;
        description = `A magical potion brewed by ${character.name}`;
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
        description = `A magical ${itemType} created by ${character.name}`;
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
    requirements: CreationRequirements,
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

    if (success && item && !this.parameters.baseItemId) {
      updatedCharacter.inventory = [...updatedCharacter.inventory, item];
    }

    return updatedCharacter;
  }
}
