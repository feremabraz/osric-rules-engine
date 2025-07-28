import type { Character } from '@rules/types';
import type { SpellComponentType, SpellWithComponents } from './advancedSpellTypes';

/**
 * Check if character can fulfill spell component requirements
 */
export const canCastWithComponents = (
  character: Character,
  spell: SpellWithComponents
): {
  canCast: boolean;
  missingComponents: string[];
  message: string;
} => {
  const missingComponents: string[] = [];

  // Check verbal components
  if (
    spell.componentRequirements.includes('V') &&
    character.statusEffects.some((effect) => effect.name === 'Silenced' || effect.name === 'Gagged')
  ) {
    missingComponents.push('Verbal (cannot speak)');
  }

  // Check somatic components
  if (spell.componentRequirements.includes('S') && !hasFreeSomaticHand(character)) {
    missingComponents.push('Somatic (need one free hand)');
  }

  // Check material components
  if (spell.componentRequirements.includes('M') && !hasMaterialComponents(character, spell)) {
    const missingMaterials = getMissingMaterials(character, spell);
    missingComponents.push(`Material (missing: ${missingMaterials.join(', ')})`);
  }

  return {
    canCast: missingComponents.length === 0,
    missingComponents,
    message:
      missingComponents.length === 0
        ? `${character.name} has all required components for ${spell.name}.`
        : `${character.name} is missing components for ${spell.name}: ${missingComponents.join(', ')}.`,
  };
};

/**
 * Check if character has at least one free hand for somatic components
 */
const hasFreeSomaticHand = (character: Character): boolean => {
  // Count hands occupied by equipment
  let occupiedHands = 0;

  const equippedItems = character.inventory.filter((item) => item.equipped);
  for (const item of equippedItems) {
    // Create a properly typed interface instead of using any
    interface Weapon {
      twoHanded?: boolean;
      type?: string;
    }
    const weapon = item as Weapon;

    if (weapon.twoHanded) {
      occupiedHands += 2;
    } else if (weapon.type === 'Weapon' || weapon.type === 'Shield') {
      occupiedHands += 1;
    }
  }

  // Check if character has status effects that restrict hands
  const restrictedHands = character.statusEffects.filter(
    (effect) =>
      effect.name === 'Restrained' || effect.name === 'Bound' || effect.name === 'Paralyzed'
  ).length;

  // Standard humanoid has 2 hands
  const totalHands = 2;
  const freeHands = totalHands - occupiedHands - restrictedHands;

  return freeHands >= 1;
};

/**
 * Check if character has required material components for a spell
 */
const hasMaterialComponents = (character: Character, spell: SpellWithComponents): boolean => {
  if (!spell.detailedMaterialComponents || spell.detailedMaterialComponents.length === 0) {
    return true;
  }

  // Get all component names from inventory
  const componentNames = character.inventory.map((item) => item.name.toLowerCase());

  // Check if all required components are in inventory
  return spell.detailedMaterialComponents.every((component) => {
    // Check for expensive components more carefully (e.g., pearl worth 100gp)
    const componentCost = component.cost;
    if (componentCost !== undefined && componentCost > 0) {
      const matchingItem = character.inventory.find(
        (item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase()) &&
          item.value >= componentCost
      );
      return !!matchingItem;
    }

    // Otherwise just check if the component exists in inventory by name
    return componentNames.some((name) => name.includes(component.name.toLowerCase()));
  });
};

/**
 * Get list of missing material components
 */
const getMissingMaterials = (character: Character, spell: SpellWithComponents): string[] => {
  if (!spell.detailedMaterialComponents || spell.detailedMaterialComponents.length === 0) {
    return [];
  }

  // Check which components are missing
  return spell.detailedMaterialComponents
    .filter((component) => {
      // For expensive components
      const componentCost = component.cost;
      if (componentCost && componentCost > 0) {
        const matchingItem = character.inventory.find(
          (item) =>
            item.name.toLowerCase().includes(component.name.toLowerCase()) &&
            item.value >= componentCost
        );
        return !matchingItem;
      }

      // For regular components
      return !character.inventory.some((item) =>
        item.name.toLowerCase().includes(component.name.toLowerCase())
      );
    })
    .map((component) =>
      component.cost ? `${component.name} (${component.cost} gp)` : component.name
    );
};

/**
 * Consume material components that are used up in casting
 */
export const consumeComponents = (character: Character, spell: SpellWithComponents): Character => {
  if (!spell.detailedMaterialComponents || !spell.componentRequirements.includes('M')) {
    return character;
  }

  const componentsToConsume = spell.detailedMaterialComponents.filter((c) => c.consumed);

  if (componentsToConsume.length === 0) {
    return character;
  }

  // Create a new inventory without the consumed components
  const newInventory = [...character.inventory];

  for (const component of componentsToConsume) {
    // Find the component in inventory
    const componentIndex = newInventory.findIndex(
      (item) =>
        item.name.toLowerCase().includes(component.name.toLowerCase()) &&
        (!component.cost || (component.cost !== undefined && item.value >= component.cost))
    );

    if (componentIndex !== -1) {
      newInventory.splice(componentIndex, 1);
    }
  }

  return {
    ...character,
    inventory: newInventory,
  };
};
