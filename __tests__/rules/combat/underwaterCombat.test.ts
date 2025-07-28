import type { SpellWithComponents } from '@/rules/spells/advancedSpellTypes';
import {
  applyUnderwaterPenalties,
  canCastSpellUnderwater,
  handleUnderwaterSpell,
} from '@rules/combat/underwaterCombat';
import type { Action, Spell, Weapon } from '@rules/types';
import { createMockCharacter } from '@tests/utils/mockData';
import { describe, expect, it } from 'vitest';

describe('Underwater Combat', () => {
  // Use the mock data utility to create a fully-fledged character
  const mockCharacter = createMockCharacter({
    customizeCharacter: {
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      level: 1,
      hitPoints: { current: 10, maximum: 10 },
      armorClass: 10,
      position: '0,0,0',
    },
  });

  const mockWeapon: Weapon = {
    id: 'weapon1',
    name: 'Dagger',
    type: 'Melee',
    damage: '1d4',
    weight: 1,
    size: 'Small',
    speed: 2,
    allowedClasses: ['Fighter', 'Thief', 'Assassin'],
    damageVsLarge: '1d3',
    range: null,
    twoHanded: false,
    description: 'A simple dagger',
    value: 2,
    equipped: true,
    magicBonus: null,
    charges: null,
  };

  const mockRangedWeapon: Weapon = {
    id: 'weapon2',
    name: 'Shortbow',
    type: 'Ranged',
    damage: '1d6',
    weight: 2,
    size: 'Medium',
    speed: 7,
    allowedClasses: ['Fighter', 'Ranger'],
    damageVsLarge: '1d6',
    range: [5, 10, 15],
    twoHanded: true,
    description: 'A short wooden bow',
    value: 30,
    equipped: true,
    magicBonus: null,
    charges: null,
  };

  const mockCrossbow: Weapon = {
    id: 'weapon3',
    name: 'Crossbow',
    type: 'Ranged',
    damage: '1d8',
    weight: 7,
    size: 'Medium',
    speed: 8,
    allowedClasses: ['Fighter', 'Cleric'],
    damageVsLarge: '1d8',
    range: [20, 40, 60],
    twoHanded: true,
    description: 'A heavy crossbow',
    value: 35,
    equipped: true,
    magicBonus: null,
    charges: null,
  };

  const mockIneffectiveWeapon: Weapon = {
    id: 'weapon4',
    name: 'Flail',
    type: 'Melee',
    damage: '1d6+1',
    weight: 5,
    size: 'Medium',
    speed: 6,
    allowedClasses: ['Fighter', 'Cleric'],
    damageVsLarge: '1d6',
    range: null,
    twoHanded: false,
    description: 'A spiked flail',
    value: 8,
    equipped: true,
    magicBonus: null,
    charges: null,
  };

  const mockSpell: SpellWithComponents = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    range: '120 feet',
    duration: 'Instantaneous',
    areaOfEffect: 'Single target',
    components: ['V', 'S'],
    castingTime: '1 action',
    savingThrow: 'None',
    description: 'Fires three darts of magical force.',
    reversible: false,
    materialComponents: null,
    effect: () => ({
      success: true,
      message: 'Magic Missile hits for 3d4+3 force damage',
      damage: [3, 3, 3],
      healing: null,
      statusEffects: null,
      narrative:
        'Three darts of magical force shoot from your fingers, unerringly striking your target.',
    }),
    componentRequirements: ['V', 'S'],
    detailedMaterialComponents: [],
  };

  describe('applyUnderwaterPenalties', () => {
    it('should allow effective underwater weapons', () => {
      const action: Action = {
        type: 'Attack',
        actor: mockCharacter,
        item: mockWeapon,
      };

      const result = applyUnderwaterPenalties(action, mockCharacter);
      expect(result.success).toBe(true);
      expect(result.message).toContain('reduced effectiveness');
      expect(result.effects).toContain('underwater_attack_penalty:-2');
    });

    it('should prevent ineffective weapons', () => {
      const action: Action = {
        type: 'Attack',
        actor: mockCharacter,
        item: mockIneffectiveWeapon,
      };

      const result = applyUnderwaterPenalties(action, mockCharacter);
      expect(result.success).toBe(false);
      expect(result.message).toContain('ineffective underwater');
    });

    it('should handle ranged weapons', () => {
      const action: Action = {
        type: 'Attack',
        actor: mockCharacter,
        item: mockRangedWeapon,
      };

      const result = applyUnderwaterPenalties(action, mockCharacter);
      expect(result.success).toBe(false);
      expect(result.message).toContain('ineffective');
    });

    it('should handle crossbows specially', () => {
      const action: Action = {
        type: 'Attack',
        actor: mockCharacter,
        item: mockCrossbow,
      };

      const result = applyUnderwaterPenalties(action, mockCharacter);
      expect(result.success).toBe(true);
      expect(result.message).toContain('must reload');
      expect(result.effects).toEqual([expect.objectContaining({ type: 'reloadRequired' })]);
    });
  });

  describe('canCastSpellUnderwater', () => {
    it('should allow spells with only verbal components', () => {
      const verbalOnlySpell: Spell = {
        ...mockSpell,
        components: ['V'],
      };
      expect(canCastSpellUnderwater(verbalOnlySpell)).toBe(true);
    });

    it('should prevent spells with material components', () => {
      const materialSpell: Spell = {
        ...mockSpell,
        components: ['V', 'M'],
      };
      expect(canCastSpellUnderwater(materialSpell)).toBe(false);
    });

    it('should prevent spells with somatic components', () => {
      const somaticSpell: Spell = {
        ...mockSpell,
        components: ['V', 'S'],
      };
      expect(canCastSpellUnderwater(somaticSpell)).toBe(false);
    });
  });

  describe('handleUnderwaterSpell', () => {
    it('should allow verbal-only spells', () => {
      const verbalOnlySpell: Spell = {
        ...mockSpell,
        components: ['V'],
      };

      const result = handleUnderwaterSpell(verbalOnlySpell, mockCharacter);
      expect(result.success).toBe(true);
      expect(result.message).toContain('casts');
    });

    it('should prevent spells with material components', () => {
      const materialSpell: Spell = {
        ...mockSpell,
        components: ['V', 'M'],
      };

      const result = handleUnderwaterSpell(materialSpell, mockCharacter);
      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot cast');
    });
  });
});
