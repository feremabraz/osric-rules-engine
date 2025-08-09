import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';

import type { Character, Item, Spell } from '@osric/types';
import { RULE_NAMES } from '@osric/types/constants';

export class ComponentTrackingRules extends BaseRule {
  public readonly name = RULE_NAMES.COMPONENT_TRACKING;
  public readonly description = 'Validates and tracks spell component requirements';

  public canApply(context: GameContext): boolean {
    const caster = this.getOptionalContext<Character>(context, 'spell:cast:caster');
    const spell = this.getOptionalContext<Spell>(context, 'spell:cast:spell');
    return !!(caster && spell);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const caster = this.getRequiredContext<Character>(context, 'spell:cast:caster');
      const spell = this.getRequiredContext<Spell>(context, 'spell:cast:spell');
      const overrideComponents =
        this.getOptionalContext<boolean>(context, 'spell:cast:components') || false;

      if (overrideComponents) {
        return this.createSuccessResult('Component requirements overridden');
      }

      const componentResult = this.validateComponents(caster, spell);
      if (!componentResult.success) {
        return componentResult;
      }

      return this.createSuccessResult(`All components available for ${spell.name}`, {
        componentsValid: true,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error checking components: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateComponents(caster: Character, spell: Spell): RuleResult {
    const missingComponents: string[] = [];

    if (spell.components.includes('V')) {
      if (!this.canPerformVerbalComponents(caster)) {
        missingComponents.push('Verbal (cannot speak)');
      }
    }

    if (spell.components.includes('S')) {
      if (!this.canPerformSomaticComponents(caster)) {
        missingComponents.push('Somatic (need one free hand)');
      }
    }

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

  private canPerformVerbalComponents(caster: Character): boolean {
    return !caster.statusEffects.some(
      (effect) => effect.name === 'Silenced' || effect.name === 'Gagged' || effect.name === 'Muted'
    );
  }

  private canPerformSomaticComponents(caster: Character): boolean {
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

    return this.hasFreeSomaticHand(caster);
  }

  private hasFreeSomaticHand(caster: Character): boolean {
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

    const totalHands = 2;
    const freeHands = totalHands - occupiedHands;

    return freeHands >= 1;
  }

  private validateMaterialComponents(caster: Character, spell: Spell): string[] {
    const missingMaterials: string[] = [];

    if (!spell.materialComponents || spell.materialComponents.length === 0) {
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

    for (const component of spell.materialComponents) {
      if (!this.hasComponent(caster, component)) {
        missingMaterials.push(component);
      }
    }

    return missingMaterials;
  }

  private hasComponent(caster: Character, componentName: string): boolean {
    const normalizedComponent = componentName.toLowerCase();

    return caster.inventory.some((item) => {
      const itemName = item.name.toLowerCase();

      if (itemName.includes(normalizedComponent)) {
        return true;
      }

      if (normalizedComponent.includes('precious') && itemName.includes('gem')) {
        return item.value >= 100;
      }

      if (normalizedComponent.includes('pearl') && itemName.includes('pearl')) {
        return item.value >= 100;
      }

      return false;
    });
  }

  public consumeComponents(caster: Character, spell: Spell): Character {
    if (!spell.materialComponents || !spell.components.includes('M')) {
      return caster;
    }

    const consumableComponents = this.getConsumableComponents(spell);

    if (consumableComponents.length === 0) {
      return caster;
    }

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

  private getConsumableComponents(spell: Spell): string[] {
    const consumableSpells: Record<string, string[]> = {
      identify: ['pearl'],
      'magic jar': ['gem'],
      contingency: ['pearl'],
      'limited wish': ['pearl'],
      wish: ['pearl'],
    };

    const spellName = spell.name.toLowerCase();
    return consumableSpells[spellName] || [];
  }

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

    return weaponTypes.some((weapon) => itemName.includes(weapon)) && !this.isTwoHandedWeapon(item);
  }
}
