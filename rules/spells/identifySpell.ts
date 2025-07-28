import type { Character, Item } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type { IdentificationResult } from './advancedSpellTypes';

/**
 * Attempt to identify a magic item using the Identify spell
 */
export const castIdentifySpell = (
  caster: Character,
  item: Item,
  hasPearl: boolean
): IdentificationResult => {
  // Check if caster has a pearl worth at least 100gp
  if (!hasPearl) {
    return {
      success: false,
      itemIdentified: false,
      propertiesRevealed: [],
      commandWordRevealed: false,
      estimatedCharges: null,
      actualCharges: item.charges,
      curseDetected: false,
      constitutionLoss: 0,
    };
  }

  // Calculate success chances
  const baseChance = 15; // Base 15% chance
  const levelBonus = caster.level * 5; // +5% per caster level
  const totalChance = baseChance + levelBonus;

  // Calculate success for each segment of the spell
  const successRoll = roll(100);
  const success = successRoll <= totalChance;

  // Calculate constitution drain
  const constitutionLoss = 8; // Standard loss from Identify

  if (!success) {
    return {
      success: false,
      itemIdentified: false,
      propertiesRevealed: [],
      commandWordRevealed: false,
      estimatedCharges: null,
      actualCharges: item.charges,
      curseDetected: false,
      constitutionLoss,
    };
  }

  // Item type and basic properties are identified
  const propertiesRevealed = [
    `Item type: ${getItemType(item)}`,
    `Magic bonus: ${item.magicBonus || 0}`,
  ];

  // Chance to detect command word
  const commandWordRoll = roll(100);
  const commandWordRevealed = commandWordRoll <= totalChance;

  // Estimated charges if applicable
  let estimatedCharges: number | null = null;
  if (item.charges !== null) {
    // Get the actual charges
    const actualCharges = item.charges;

    // Calculate estimation (±25%)
    const variance = Math.floor(actualCharges * 0.25);
    const minEstimate = Math.max(0, actualCharges - variance);
    const maxEstimate = actualCharges + variance;

    estimatedCharges = roll(maxEstimate - minEstimate) + minEstimate;
  }

  // Small chance to detect curses (1% per caster level)
  const curseDetectionChance = caster.level;
  const curseRoll = roll(100);
  const curseDetected = curseRoll <= curseDetectionChance;

  return {
    success: true,
    itemIdentified: true,
    propertiesRevealed,
    commandWordRevealed,
    estimatedCharges,
    actualCharges: item.charges,
    curseDetected,
    constitutionLoss,
  };
};

/**
 * Restore constitution lost from identify spell
 */
export const recoverConstitution = (character: Character, hoursRested: number): Character => {
  // Find the con loss status effect
  const conLossEffect = character.statusEffects.find(
    (effect) => effect.name === 'Constitution Loss (Identify)'
  );

  if (!conLossEffect) {
    return character;
  }

  // Calculate recovery (1 point per hour)
  const recoveryPoints = Math.min(hoursRested, conLossEffect.duration);
  const remainingLoss = Math.max(0, conLossEffect.duration - recoveryPoints);

  // Create updated status effects
  let updatedEffects = [...character.statusEffects];

  if (remainingLoss === 0) {
    // Remove the effect entirely
    updatedEffects = updatedEffects.filter(
      (effect) => effect.name !== 'Constitution Loss (Identify)'
    );
  } else {
    // Update the effect duration
    updatedEffects = updatedEffects.map((effect) =>
      effect.name === 'Constitution Loss (Identify)'
        ? { ...effect, duration: remainingLoss }
        : effect
    );
  }

  return {
    ...character,
    statusEffects: updatedEffects,
  };
};

/**
 * Get the type of an item (for identification purposes)
 */
const getItemType = (item: Item): string => {
  // This is a simplified version - you would expand this
  // based on your actual item type system
  interface ExtendedItem extends Item {
    type?: string;
    itemType?: string;
    subType?: string;
    isHoly?: boolean;
  }

  const extendedItem = item as ExtendedItem;

  if (extendedItem.type === 'Weapon') {
    return 'Weapon';
  }

  if (extendedItem.type === 'Armor') {
    return 'Armor';
  }

  if (extendedItem.itemType === 'scroll') {
    return 'Scroll';
  }

  if (extendedItem.itemType === 'potion') {
    return 'Potion';
  }

  if (extendedItem.itemType === 'wand') {
    return 'Wand';
  }

  if (extendedItem.itemType === 'rod') {
    return 'Rod';
  }

  if (extendedItem.itemType === 'staff') {
    return 'Staff';
  }

  if (extendedItem.itemType === 'ring') {
    return 'Ring';
  }

  return 'Miscellaneous Magic';
};

/**
 * Attempt to identify a magic item through arcane study (non-spell version)
 * Represents alternative identification methods like Legend Lore, research, etc.
 */
export const identifyMagicItem = (
  character: Character,
  item: Item,
  options?: { testMode?: boolean }
): IdentificationResult => {
  // Calculate intelligence-based success chances
  // Higher intelligence characters have a better chance of success
  const baseChance = 10; // Base 10% chance
  const intModifier = character.abilities.intelligence - 10; // Each point above 10 adds 5%
  const intelligenceBonus = intModifier * 5;
  const levelBonus = character.level * 3; // +3% per character level
  const totalChance = baseChance + intelligenceBonus + levelBonus;

  // In test mode, always succeed for consistent test results
  const testMode = options?.testMode === true;
  // Roll for success (or force success in test mode)
  const successRoll = testMode ? 0 : Math.random() * 100;
  const success = testMode || successRoll <= totalChance;

  // Calculate constitution drain (studying magic items is taxing)
  // Lower roll = more drain
  const constitutionRoll = Math.random();
  const constitutionLoss = constitutionRoll < 0.1 ? Math.floor(Math.random() * 3) + 1 : 0;

  if (!success) {
    return {
      success: false,
      itemIdentified: false,
      propertiesRevealed: [],
      commandWordRevealed: false,
      estimatedCharges: null,
      actualCharges: (item as Item & { charges?: number | null }).charges || null,
      curseDetected: false,
      constitutionLoss,
    };
  }

  // Item type and basic properties are identified
  const propertiesRevealed = [
    `Item type: ${getItemType(item)}`,
    `Magic bonus: ${item.magicBonus || 0}`,
  ];

  // Additional properties based on character's intelligence
  if (character.abilities.intelligence >= 15) {
    propertiesRevealed.push(`Value estimate: ${estimateItemValue(item)} gp`);
  }

  if (character.abilities.intelligence >= 17) {
    propertiesRevealed.push(`Origin: ${determineItemOrigin(item)}`);
  }

  // Chance to detect command word (20% + 2% per INT above 10)
  const commandWordChance = 20 + (character.abilities.intelligence - 10) * 2;
  const commandWordRoll = Math.random() * 100;
  const commandWordRevealed = commandWordRoll <= commandWordChance;

  // Estimated charges if applicable
  let estimatedCharges: number | null = null;
  if (
    (item as Item & { charges?: number | null }).charges !== null &&
    (item as Item & { charges?: number | null }).charges !== undefined
  ) {
    // Get the actual charges
    const actualCharges = (item as Item & { charges: number }).charges;

    // Calculate estimation accuracy based on intelligence
    const accuracyModifier = Math.max(0.05, 0.5 - character.abilities.intelligence * 0.02);
    const variance = Math.floor(actualCharges * accuracyModifier);
    const minEstimate = Math.max(0, actualCharges - variance);
    const maxEstimate = actualCharges + variance;

    estimatedCharges = Math.floor(Math.random() * (maxEstimate - minEstimate + 1)) + minEstimate;
  }

  // Chance to detect curses (2% per intelligence point above 10)
  const curseDetectionChance = (character.abilities.intelligence - 10) * 2;
  const curseRoll = Math.random() * 100;
  const curseDetected =
    curseRoll <= curseDetectionChance && ((item as Item & { cursed?: boolean }).cursed || false);

  return {
    success: true,
    itemIdentified: true,
    propertiesRevealed,
    commandWordRevealed,
    estimatedCharges,
    actualCharges: (item as Item & { charges?: number | null }).charges || null,
    curseDetected,
    constitutionLoss,
  };
};

/**
 * Estimate the value of a magic item
 */
const estimateItemValue = (item: Item): number => {
  const baseValue = item.value || 0;

  // Apply a random variance of ±20%
  const variance = 0.2;
  const multiplier = 1 + (Math.random() * 2 * variance - variance);

  return Math.floor(baseValue * multiplier);
};

/**
 * Determine the potential origin of a magic item
 */
const determineItemOrigin = (item: Item): string => {
  // This could be expanded with a more sophisticated system
  // linking item properties to specific origins
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

  // Deterministic selection based on item id to ensure consistency
  const seed = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return origins[seed % origins.length];
};

// Store identification results for access across components
export function createIdentificationResultManager(
  initialResult: IdentificationResult | null = null
) {
  return {
    result: initialResult,
    setResult: (result: IdentificationResult | null) => result,
    getResult: () => initialResult,
    clearResult: () => null,
  };
}
