import type { Item } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Types of magic devices that use charges
 */
export type ChargableItemType = 'wand' | 'rod' | 'staff';

/**
 * Calculate initial charges for a newly found magic item
 */
export const calculateInitialCharges = (itemType: ChargableItemType): number => {
  switch (itemType) {
    case 'wand':
      // 101 - 1d20
      return 101 - roll(20);
    case 'rod':
      // 51 - 1d10
      return 51 - roll(10);
    case 'staff':
      // 26 - 1d6
      return 26 - roll(6);
    default:
      return 0;
  }
};

/**
 * Use a charge from a magic item
 */
export const useCharge = (
  item: Item
): {
  updatedItem: Item;
  disintegrated: boolean;
  message: string;
} => {
  if (item.charges === null || item.charges === undefined) {
    return {
      updatedItem: item,
      disintegrated: false,
      message: `${item.name} doesn't use charges.`,
    };
  }

  if (item.charges <= 0) {
    return {
      updatedItem: item,
      disintegrated: true,
      message: `${item.name} has no charges left and disintegrates into dust!`,
    };
  }

  const newCharges = item.charges - 1;
  const disintegrated = newCharges === 0;

  const updatedItem = {
    ...item,
    charges: newCharges,
  };

  const message = disintegrated
    ? `${item.name} is used one final time and disintegrates into dust!`
    : `${item.name} is used. ${newCharges} charge${newCharges !== 1 ? 's' : ''} remaining.`;

  return {
    updatedItem,
    disintegrated,
    message,
  };
};

/**
 * Item saving throw values against Rod of Cancellation
 */
export const ITEM_SAVING_THROWS = {
  potion: 20,
  ring: 17,
  rod: 14,
  scroll: 19,
  staff: 13,
  wand: 15,
  artifact: 13,
  armor: 11, // Standard armor
  armorPowerful: 8, // +5 armor
  sword: 9, // Standard magic sword
  swordHoly: 7, // Holy Sword
  miscMagic: 12,
};

/**
 * Magic item saving throw check against destructive effects
 */
export const itemSavingThrow = (
  item: Item,
  effectType: 'rod_of_cancellation' | 'dispel_magic' | 'antimagic_field'
): {
  success: boolean;
  targetRoll: number;
  actualRoll: number;
  message: string;
} => {
  // Define a proper interface for magic item properties
  interface MagicItem extends Item {
    itemType?: string;
    type?: string;
    subType?: string;
    isHoly?: boolean;
    // Keep magicBonus compatible with Item interface
  }

  // Determine the item type for saving throw purposes
  let itemType: keyof typeof ITEM_SAVING_THROWS = 'miscMagic';

  // Cast to our magic item interface once for type safety
  const magicItem = item as MagicItem;

  // This is a simplified version - it would expanded based on an item system
  if (magicItem.itemType === 'potion') itemType = 'potion';
  else if (magicItem.itemType === 'ring') itemType = 'ring';
  else if (magicItem.itemType === 'rod') itemType = 'rod';
  else if (magicItem.itemType === 'scroll') itemType = 'scroll';
  else if (magicItem.itemType === 'staff') itemType = 'staff';
  else if (magicItem.itemType === 'wand') itemType = 'wand';
  else if (magicItem.itemType === 'artifact') itemType = 'artifact';
  else if (magicItem.type === 'Armor') {
    // Check if it's +5 armor
    itemType = magicItem.magicBonus === 5 ? 'armorPowerful' : 'armor';
  } else if (magicItem.type === 'Weapon' && magicItem.subType === 'sword') {
    // Check if it's a holy sword
    itemType = magicItem.isHoly ? 'swordHoly' : 'sword';
  }

  // Get the target roll needed
  const targetRoll = ITEM_SAVING_THROWS[itemType];

  // For some effects like antimagic field, the save may be easier
  let adjustedTarget = targetRoll;
  if (effectType === 'dispel_magic') {
    adjustedTarget += 2; // Easier to save against dispel
  } else if (effectType === 'antimagic_field') {
    adjustedTarget += 4; // Much easier to save against antimagic field
  }

  // Roll the save
  const diceRoll = roll(20);
  const success = diceRoll >= adjustedTarget;

  let message = '';
  if (success) {
    message = `${item.name} resists the ${formatEffectType(effectType)}!`;
  } else {
    message = `${item.name} fails to resist the ${formatEffectType(effectType)} and is affected.`;
  }

  return {
    success,
    targetRoll: adjustedTarget,
    actualRoll: diceRoll,
    message,
  };
};

/**
 * Format the effect type for display
 */
const formatEffectType = (effectType: string): string => {
  return effectType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Store active magic items for access across components
export function createActiveItemsManager(initialItems: Item[] = []) {
  return {
    items: initialItems,
    addItem: (item: Item) => [...initialItems, item],
    removeItem: (id: string) => initialItems.filter((item) => item.id !== id),
    getActiveItems: () => initialItems,
  };
}
