import type { Character } from '@osric/types/character';
import type { Item } from '@osric/types/item';
import type { Spell } from '@osric/types/spell';
import type { MaterialComponent, SpellWithComponents } from '@osric/types/spell-types';
import { ContextKeys } from '../../core/ContextKeys';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellComponentManagementRules extends BaseRule {
  name = 'spell-component-management';
  description = 'Manage detailed spell components and their availability';

  canApply(context: GameContext): boolean {
    const caster = context.getTemporary(ContextKeys.SPELL_CASTER);
    const spell = context.getTemporary(ContextKeys.SPELL_TO_CAST);
    return caster !== null && spell !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_CASTER);
    const spell = context.getTemporary<SpellWithComponents>(ContextKeys.SPELL_TO_CAST);

    if (!caster || !spell) {
      return this.createFailureResult('Missing caster or spell information');
    }

    const missingComponents: string[] = [];
    const consumedComponents: MaterialComponent[] = [];

    if (spell.componentRequirements.includes('V')) {
      if (caster.statusEffects?.some((effect) => effect.name.toLowerCase().includes('silence'))) {
        missingComponents.push('Verbal (silenced)');
      }
    }

    if (spell.componentRequirements.includes('S')) {
      const hasHandsFree = true;

      if (!hasHandsFree) {
        missingComponents.push('Somatic (hands occupied)');
      }

      if (
        caster.statusEffects?.some(
          (effect) =>
            effect.name.toLowerCase().includes('paralyz') ||
            effect.name.toLowerCase().includes('bound')
        )
      ) {
        missingComponents.push('Somatic (cannot move hands)');
      }
    }

    if (spell.componentRequirements.includes('M')) {
      for (const component of spell.detailedMaterialComponents) {
        const hasComponent = caster.inventory.some((item: Item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase())
        );

        if (!hasComponent) {
          const hasSpellPouch = caster.inventory.some(
            (item: Item) =>
              item.name.toLowerCase().includes('spell component pouch') ||
              item.name.toLowerCase().includes('component pouch')
          );

          if (!hasSpellPouch || (component.cost && component.cost > 1)) {
            missingComponents.push(`Material: ${component.name}`);
          }
        } else if (component.consumed) {
          consumedComponents.push(component);
        }
      }
    }

    if (missingComponents.length > 0) {
      return this.createFailureResult(
        `Cannot cast "${spell.name}" - missing components: ${missingComponents.join(', ')}`
      );
    }

    if (consumedComponents.length > 0) {
      for (const component of consumedComponents) {
        const itemIndex = caster.inventory.findIndex((item: Item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase())
        );

        if (itemIndex >= 0) {
          caster.inventory.splice(itemIndex, 1);
        }
      }

      context.setEntity(caster.id, caster);
    }

    const message = `${caster.name} has all required components for "${spell.name}". ${
      consumedComponents.length > 0
        ? `Consumed: ${consumedComponents.map((c) => c.name).join(', ')}`
        : 'No components consumed'
    }`;

    return this.createSuccessResult(message, {
      spellName: spell.name,
      componentsChecked: spell.componentRequirements,
      consumedComponents: consumedComponents.map((c) => c.name),
    });
  }
}
