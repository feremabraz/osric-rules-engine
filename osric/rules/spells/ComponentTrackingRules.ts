import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { Character, Item, Spell } from '../../types';
import { RULE_NAMES } from '../../types/constants';

/**
 * Rule for tracking and validating spell component requirements in the OSRIC system.
 *
 * Preserves OSRIC component mechanics:
 * - Verbal component validation (can the caster speak?)
 * - Somatic component validation (are hands free?)
 * - Material component validation (does caster have required materials?)
 * - Component consumption for spells that use up materials
 */
export class ComponentTrackingRules extends BaseRule {
  public readonly name = RULE_NAMES.COMPONENT_TRACKING;
  public readonly description = 'Validates and tracks spell component requirements';

  public canApply(context: GameContext): boolean {
    // This rule applies when we have component tracking temporary data
    const caster = context.getTemporary<Character>('castSpell_caster');
    const spell = context.getTemporary<Spell>('castSpell_spell');
    return !!(caster && spell);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const caster = context.getTemporary<Character>('castSpell_caster');
      const spell = context.getTemporary<Spell>('castSpell_spell');
      const overrideComponents =
        context.getTemporary<boolean>('castSpell_overrideComponents') || false;

      if (!caster || !spell) {
        return this.createFailureResult('Missing caster or spell in context');
      }

      // Skip component checking if overridden (magic items, etc.)
      if (overrideComponents) {
        return this.createSuccessResult('Component requirements overridden');
      }

      // Check each component type required by the spell
      const componentResult = this.validateComponents(caster, spell);
      if (!componentResult.success) {
        return componentResult;
      }

      // If we reach here, all components are available
      // We don't consume them yet - that happens after successful casting
      return this.createSuccessResult(`All components available for ${spell.name}`, {
        componentsValid: true,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error checking components: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate all component requirements for a spell
   * Preserves OSRIC component rules: Verbal, Somatic, Material
   */
  private validateComponents(caster: Character, spell: Spell): RuleResult {
    const missingComponents: string[] = [];

    // Check verbal components (V)
    if (spell.components.includes('V')) {
      if (!this.canPerformVerbalComponents(caster)) {
        missingComponents.push('Verbal (cannot speak)');
      }
    }

    // Check somatic components (S)
    if (spell.components.includes('S')) {
      if (!this.canPerformSomaticComponents(caster)) {
        missingComponents.push('Somatic (need one free hand)');
      }
    }

    // Check material components (M)
    if (spell.components.includes('M')) {
      const materialResult = this.validateMaterialComponents(caster, spell);
      if (materialResult.length > 0) {
        missingComponents.push(`Material (missing: ${materialResult.join(', ')})`);
      }
    }

    if (missingComponents.length > 0) {
      return this.createFailureResult(
        `${caster.name} is missing components for ${spell.name}: ${missingComponents.join(', ')}`
      );
    }

    return this.createSuccessResult('All components available');
  }

  /**
   * Check if the caster can perform verbal components
   * OSRIC rules: Must be able to speak clearly
   */
  private canPerformVerbalComponents(caster: Character): boolean {
    // Check for silencing effects
    return !caster.statusEffects.some(
      (effect) => effect.name === 'Silenced' || effect.name === 'Gagged' || effect.name === 'Muted'
    );
  }

  /**
   * Check if the caster can perform somatic components
   * OSRIC rules: Must have at least one free hand
   */
  private canPerformSomaticComponents(caster: Character): boolean {
    // Check for movement restrictions
    const movementRestricted = caster.statusEffects.some(
      (effect) =>
        effect.name === 'Paralyzed' ||
        effect.name === 'Restrained' ||
        effect.name === 'Bound' ||
        effect.name === 'Entangled'
    );

    if (movementRestricted) {
      return false;
    }

    // Check hand availability
    return this.hasFreeSomaticHand(caster);
  }

  /**
   * Check if character has at least one free hand for somatic components
   * Preserves OSRIC equipment and hand usage rules
   */
  private hasFreeSomaticHand(caster: Character): boolean {
    // Count hands occupied by equipment
    let occupiedHands = 0;
    const equippedItems = caster.inventory.filter((item) => item.equipped);

    for (const item of equippedItems) {
      if (this.isShield(item)) {
        occupiedHands += 1;
      } else if (this.isTwoHandedWeapon(item)) {
        occupiedHands += 2;
      } else if (this.isOneHandedWeapon(item)) {
        occupiedHands += 1;
      }
    }

    // Standard humanoid has 2 hands
    const totalHands = 2;
    const freeHands = totalHands - occupiedHands;

    return freeHands >= 1;
  }

  /**
   * Validate material components required for the spell
   * Preserves OSRIC material component rules and costs
   */
  private validateMaterialComponents(caster: Character, spell: Spell): string[] {
    const missingMaterials: string[] = [];

    // If spell has no specific material components listed, it requires a basic focus
    if (!spell.materialComponents || spell.materialComponents.length === 0) {
      // Check for spell component pouch or spell focus
      const hasFocus = caster.inventory.some(
        (item) =>
          item.name.toLowerCase().includes('component pouch') ||
          item.name.toLowerCase().includes('spell focus') ||
          item.name.toLowerCase().includes('focus')
      );

      if (!hasFocus) {
        missingMaterials.push('spell component pouch or focus');
      }

      return missingMaterials;
    }

    // Check for specific material components
    for (const component of spell.materialComponents) {
      if (!this.hasComponent(caster, component)) {
        missingMaterials.push(component);
      }
    }

    return missingMaterials;
  }

  /**
   * Check if the caster has a specific material component
   */
  private hasComponent(caster: Character, componentName: string): boolean {
    const normalizedComponent = componentName.toLowerCase();

    // Look for the component in inventory
    return caster.inventory.some((item) => {
      const itemName = item.name.toLowerCase();

      // Direct name match
      if (itemName.includes(normalizedComponent)) {
        return true;
      }

      // Handle common component variations
      if (normalizedComponent.includes('precious') && itemName.includes('gem')) {
        return item.value >= 100; // Precious gems worth at least 100gp
      }

      if (normalizedComponent.includes('pearl') && itemName.includes('pearl')) {
        return item.value >= 100; // Pearls worth at least 100gp for identify
      }

      return false;
    });
  }

  /**
   * Consume material components that are used up in casting
   * This is called after successful spell casting
   */
  public consumeComponents(caster: Character, spell: Spell): Character {
    if (!spell.materialComponents || !spell.components.includes('M')) {
      return caster;
    }

    // Determine which components are consumed (most are not consumed in OSRIC)
    const consumableComponents = this.getConsumableComponents(spell);

    if (consumableComponents.length === 0) {
      return caster;
    }

    // Create new inventory without consumed components
    const newInventory = [...caster.inventory];

    for (const component of consumableComponents) {
      const componentIndex = newInventory.findIndex((item) =>
        item.name.toLowerCase().includes(component.toLowerCase())
      );

      if (componentIndex !== -1) {
        newInventory.splice(componentIndex, 1);
      }
    }

    return {
      ...caster,
      inventory: newInventory,
    };
  }

  /**
   * Determine which material components are consumed by the spell
   * Most OSRIC spells do not consume their material components
   */
  private getConsumableComponents(spell: Spell): string[] {
    // Map of spells that consume their material components
    const consumableSpells: Record<string, string[]> = {
      identify: ['pearl'], // Pearl worth 100gp is consumed
      'magic jar': ['gem'], // Gem is consumed
      contingency: ['pearl'], // Pearl worth 1500gp is consumed
      'limited wish': ['pearl'], // Pearl worth 300gp is consumed
      wish: ['pearl'], // Pearl worth 5000gp is consumed
    };

    const spellName = spell.name.toLowerCase();
    return consumableSpells[spellName] || [];
  }

  /**
   * Helper methods for equipment identification
   */
  private isShield(item: Item): boolean {
    return item.name.toLowerCase().includes('shield');
  }

  private isTwoHandedWeapon(item: Item): boolean {
    const twoHandedWeapons = [
      'two-handed sword',
      'great sword',
      'staff',
      'quarterstaff',
      'bow',
      'longbow',
      'shortbow',
      'crossbow',
      'two-handed',
    ];

    const itemName = item.name.toLowerCase();
    return twoHandedWeapons.some((weapon) => itemName.includes(weapon));
  }

  private isOneHandedWeapon(item: Item): boolean {
    const weaponTypes = [
      'sword',
      'axe',
      'mace',
      'hammer',
      'club',
      'dagger',
      'spear',
      'javelin',
      'scimitar',
      'weapon',
    ];

    const itemName = item.name.toLowerCase();

    // Must contain weapon type but not be two-handed
    return weaponTypes.some((weapon) => itemName.includes(weapon)) && !this.isTwoHandedWeapon(item);
  }
}
