import type { GameContext } from '@osric/core/GameContext';

import { Spell, SpellFactory } from '@osric/entities/Spell';
import type { Spell as BaseSpell } from '@osric/types/entities';
import { describe, expect, it } from 'vitest';

describe('Spell', () => {
  const createMockSpell = (overrides: Partial<BaseSpell> = {}): BaseSpell => ({
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    range: '10 yards',
    duration: 'instantaneous',
    areaOfEffect: '1 creature',
    components: ['V', 'S'],
    castingTime: '1 segment',
    savingThrow: 'None',
    description: 'Creates glowing darts of magical force that strike unerringly.',
    reversible: false,
    materialComponents: null,
    effect: () => ({ damage: null, healing: null, statusEffects: null, narrative: '' }),
    ...overrides,
  });

  describe('Creation and Validation', () => {
    it('should create with valid parameters', () => {
      const spellData = createMockSpell();
      const spell = new Spell(spellData);

      expect(spell.name).toBe('Magic Missile');
      expect(spell.level).toBe(1);
      expect(spell.spellClass).toBe('Magic-User');
      expect(spell.range).toBe('10 yards');
      expect(spell.duration).toBe('instantaneous');
      expect(spell.castingTime).toBe('1 segment');
      expect(spell.areaOfEffect).toBe('1 creature');
      expect(spell.savingThrow).toBe('None');
      expect(spell.components).toEqual(['V', 'S']);
      expect(spell.description).toBe(
        'Creates glowing darts of magical force that strike unerringly.'
      );
      expect(spell.reversible).toBe(false);
      expect(spell.materialComponents).toBeNull();
    });

    it('should validate required properties through factory', () => {
      const invalidSpell = createMockSpell({ name: '', level: 0 });
      const validation = SpellFactory.validate(invalidSpell);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Spell level 0 is outside OSRIC range (1-9)');
      expect(validation.errors).toContain('Spell name is required');
    });

    it('should validate spell level boundaries', () => {
      const tooHighLevel = createMockSpell({ level: 10 });
      const validation = SpellFactory.validate(tooHighLevel);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Spell level 10 is outside OSRIC range (1-9)');
    });

    it('should validate components requirement', () => {
      const noComponents = createMockSpell({ components: [] });
      const validation = SpellFactory.validate(noComponents);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Spell must have at least one component');
    });
  });

  describe('Property Access', () => {
    it('should provide correct property getters', () => {
      const spell = new Spell(
        createMockSpell({
          name: 'Fireball',
          level: 3,
          class: 'Magic-User',
          components: ['V', 'S', 'M'],
          materialComponents: ['bat guano', 'sulfur'],
          reversible: false,
        })
      );

      expect(spell.name).toBe('Fireball');
      expect(spell.level).toBe(3);
      expect(spell.spellClass).toBe('Magic-User');
      expect(spell.components).toEqual(['V', 'S', 'M']);
      expect(spell.materialComponents).toEqual(['bat guano', 'sulfur']);
      expect(spell.reversible).toBe(false);
    });

    it('should return immutable data copy', () => {
      const spell = new Spell(createMockSpell());
      const data = spell.data;

      data.name = 'Modified Name';
      expect(spell.name).toBe('Magic Missile');
    });
  });

  describe('Component Requirements', () => {
    it('should detect verbal components correctly', () => {
      const verbalSpell = new Spell(createMockSpell({ components: ['V', 'S'] }));
      const verbalSpellLong = new Spell(createMockSpell({ components: ['Verbal', 'Somatic'] }));
      const nonVerbalSpell = new Spell(createMockSpell({ components: ['S', 'M'] }));

      expect(verbalSpell.requiresVerbal()).toBe(true);
      expect(verbalSpellLong.requiresVerbal()).toBe(true);
      expect(nonVerbalSpell.requiresVerbal()).toBe(false);
    });

    it('should detect somatic components correctly', () => {
      const somaticSpell = new Spell(createMockSpell({ components: ['V', 'S'] }));
      const somaticSpellLong = new Spell(createMockSpell({ components: ['Verbal', 'Somatic'] }));
      const nonSomaticSpell = new Spell(createMockSpell({ components: ['V', 'M'] }));

      expect(somaticSpell.requiresSomatic()).toBe(true);
      expect(somaticSpellLong.requiresSomatic()).toBe(true);
      expect(nonSomaticSpell.requiresSomatic()).toBe(false);
    });

    it('should detect material components correctly', () => {
      const materialSpell = new Spell(
        createMockSpell({
          components: ['V', 'S', 'M'],
          materialComponents: ['bat guano'],
        })
      );
      const materialSpellLong = new Spell(
        createMockSpell({
          components: ['Verbal', 'Somatic', 'Material'],
        })
      );
      const materialComponentsOnly = new Spell(
        createMockSpell({
          components: ['V', 'S'],
          materialComponents: ['sulfur'],
        })
      );
      const nonMaterialSpell = new Spell(
        createMockSpell({
          components: ['V', 'S'],
          materialComponents: null,
        })
      );

      expect(materialSpell.requiresMaterial()).toBe(true);
      expect(materialSpellLong.requiresMaterial()).toBe(true);
      expect(materialComponentsOnly.requiresMaterial()).toBe(true);
      expect(nonMaterialSpell.requiresMaterial()).toBe(false);
    });
  });

  describe('Casting Time Parsing', () => {
    it('should parse casting time values correctly', () => {
      const segmentSpell = new Spell(createMockSpell({ castingTime: '3 segments' }));
      const roundSpell = new Spell(createMockSpell({ castingTime: '2 rounds' }));
      const turnSpell = new Spell(createMockSpell({ castingTime: '1 turn' }));
      const hourSpell = new Spell(createMockSpell({ castingTime: '4 hours' }));
      const daySpell = new Spell(createMockSpell({ castingTime: '7 days' }));

      expect(segmentSpell.getCastingTimeValue()).toEqual({ value: 3, unit: 'segment' });
      expect(roundSpell.getCastingTimeValue()).toEqual({ value: 2, unit: 'round' });
      expect(turnSpell.getCastingTimeValue()).toEqual({ value: 1, unit: 'turn' });
      expect(hourSpell.getCastingTimeValue()).toEqual({ value: 4, unit: 'hour' });
      expect(daySpell.getCastingTimeValue()).toEqual({ value: 7, unit: 'day' });
    });

    it('should default to 1 segment for unknown formats', () => {
      const unknownSpell = new Spell(createMockSpell({ castingTime: 'special' }));
      expect(unknownSpell.getCastingTimeValue()).toEqual({ value: 1, unit: 'segment' });
    });
  });

  describe('Duration Parsing', () => {
    it('should parse duration values correctly', () => {
      const permanentSpell = new Spell(createMockSpell({ duration: 'permanent' }));
      const instantSpell = new Spell(createMockSpell({ duration: 'instantaneous' }));
      const roundSpell = new Spell(createMockSpell({ duration: '5 rounds' }));
      const turnSpell = new Spell(createMockSpell({ duration: '3 turns' }));

      expect(permanentSpell.getDurationValue()).toEqual({
        value: 0,
        unit: 'permanent',
        permanent: true,
      });
      expect(instantSpell.getDurationValue()).toEqual({
        value: 0,
        unit: 'permanent',
        permanent: true,
      });
      expect(roundSpell.getDurationValue()).toEqual({ value: 5, unit: 'rounds', permanent: false });
      expect(turnSpell.getDurationValue()).toEqual({ value: 3, unit: 'turns', permanent: false });
    });

    it('should default to 1 round for unknown formats', () => {
      const unknownSpell = new Spell(createMockSpell({ duration: 'special' }));
      expect(unknownSpell.getDurationValue()).toEqual({
        value: 1,
        unit: 'round',
        permanent: false,
      });
    });
  });

  describe('Range Parsing', () => {
    it('should parse range values correctly', () => {
      const touchSpell = new Spell(createMockSpell({ range: 'touch' }));
      const selfSpell = new Spell(createMockSpell({ range: 'self' }));
      const casterSpell = new Spell(createMockSpell({ range: 'caster' }));
      const yardsSpell = new Spell(createMockSpell({ range: '30 yards' }));
      const feetSpell = new Spell(createMockSpell({ range: '60 feet' }));

      expect(touchSpell.getRangeValue()).toEqual({
        value: 0,
        unit: 'touch',
        touch: true,
        self: false,
      });
      expect(selfSpell.getRangeValue()).toEqual({
        value: 0,
        unit: 'self',
        touch: false,
        self: true,
      });
      expect(casterSpell.getRangeValue()).toEqual({
        value: 0,
        unit: 'self',
        touch: false,
        self: true,
      });

      expect(yardsSpell.getRangeValue().value).toBeCloseTo(27, 0);
      expect(yardsSpell.getRangeValue().unit).toBe('meters');

      expect(feetSpell.getRangeValue().value).toBeCloseTo(18, 0);
      expect(feetSpell.getRangeValue().unit).toBe('meters');
    });

    it('should default to 9 meters for unknown formats', () => {
      const unknownSpell = new Spell(createMockSpell({ range: 'special' }));
      expect(unknownSpell.getRangeValue()).toEqual({
        value: 9,
        unit: 'meters',
        touch: false,
        self: false,
      });
    });
  });

  describe('Saving Throw Detection', () => {
    it('should detect saving throw requirements', () => {
      const noSaveSpell = new Spell(createMockSpell({ savingThrow: 'None' }));
      const saveSpell = new Spell(createMockSpell({ savingThrow: 'Breath Weapons' }));

      expect(noSaveSpell.allowsSavingThrow()).toBe(false);
      expect(saveSpell.allowsSavingThrow()).toBe(true);
      expect(noSaveSpell.getSavingThrowType()).toBe('None');
      expect(saveSpell.getSavingThrowType()).toBe('Breath Weapons');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition spell mechanics', () => {
      const magicUserSpell = new Spell(createMockSpell({ level: 9, class: 'Magic-User' }));
      const clericSpell = new Spell(createMockSpell({ level: 7, class: 'Cleric' }));
      const druidSpell = new Spell(createMockSpell({ level: 7, class: 'Druid' }));
      const illusionistSpell = new Spell(createMockSpell({ level: 7, class: 'Illusionist' }));

      expect(magicUserSpell.canBeCastByClass('Magic-User')).toBe(true);
      expect(clericSpell.canBeCastByClass('Cleric')).toBe(true);
      expect(druidSpell.canBeCastByClass('Druid')).toBe(true);
      expect(illusionistSpell.canBeCastByClass('Illusionist')).toBe(true);

      expect(clericSpell.canBeCastByClass('Magic-User')).toBe(true);
      expect(magicUserSpell.canBeCastByClass('Fighter')).toBe(false);
    });

    it('should enforce character level requirements for spell casting', () => {
      const level1Spell = new Spell(createMockSpell({ level: 1, class: 'Magic-User' }));
      const level5Spell = new Spell(createMockSpell({ level: 5, class: 'Magic-User' }));
      const level9Spell = new Spell(createMockSpell({ level: 9, class: 'Magic-User' }));

      expect(level1Spell.canBeCastAtLevel(1, 'Magic-User')).toBe(true);

      expect(level5Spell.canBeCastAtLevel(9, 'Magic-User')).toBe(true);

      expect(level9Spell.canBeCastAtLevel(17, 'Magic-User')).toBe(true);

      expect(level5Spell.canBeCastAtLevel(5, 'Magic-User')).toBe(false);
      expect(level9Spell.canBeCastAtLevel(15, 'Magic-User')).toBe(false);
    });

    it('should handle Paladin and Ranger spell restrictions', () => {
      const level1Spell = new Spell(createMockSpell({ level: 1, class: 'Cleric' }));
      const level4Spell = new Spell(createMockSpell({ level: 4, class: 'Cleric' }));

      expect(level1Spell.canBeCastAtLevel(8, 'Ranger')).toBe(true);
      expect(level1Spell.canBeCastAtLevel(7, 'Ranger')).toBe(false);

      expect(level1Spell.canBeCastAtLevel(9, 'Paladin')).toBe(true);
      expect(level1Spell.canBeCastAtLevel(8, 'Paladin')).toBe(false);

      expect(level4Spell.canBeCastAtLevel(15, 'Paladin')).toBe(true);
      expect(level4Spell.canBeCastAtLevel(14, 'Paladin')).toBe(false);
    });

    it('should validate component availability for casting', () => {
      const verbalSpell = new Spell(createMockSpell({ components: ['V'] }));
      const somaticSpell = new Spell(createMockSpell({ components: ['S'] }));
      const materialSpell = new Spell(
        createMockSpell({
          components: ['M'],
          materialComponents: ['diamond'],
        })
      );
      const allComponentsSpell = new Spell(
        createMockSpell({
          components: ['V', 'S', 'M'],
          materialComponents: ['silver dust'],
        })
      );

      expect(
        verbalSpell.canCastWithComponents({
          canSpeak: true,
          handsAvailable: 2,
          hasMaterialComponent: false,
        })
      ).toBe(true);

      expect(
        verbalSpell.canCastWithComponents({
          canSpeak: false,
          handsAvailable: 2,
          hasMaterialComponent: false,
        })
      ).toBe(false);

      expect(
        somaticSpell.canCastWithComponents({
          canSpeak: true,
          handsAvailable: 0,
          hasMaterialComponent: false,
        })
      ).toBe(false);

      expect(
        materialSpell.canCastWithComponents({
          canSpeak: true,
          handsAvailable: 2,
          hasMaterialComponent: false,
        })
      ).toBe(false);

      expect(
        allComponentsSpell.canCastWithComponents({
          canSpeak: true,
          handsAvailable: 1,
          hasMaterialComponent: true,
        })
      ).toBe(true);
    });
  });

  describe('Damage Calculation', () => {
    it('should calculate Magic Missile damage correctly', () => {
      const magicMissile = new Spell(
        createMockSpell({
          name: 'Magic Missile',
          description: 'Creates missiles that cause 1d4+1 damage each',
        })
      );

      expect(magicMissile.calculateDamage(1)).toEqual({ dice: '1d4', bonus: 1 });

      expect(magicMissile.calculateDamage(3)).toEqual({ dice: '2d4', bonus: 2 });

      expect(magicMissile.calculateDamage(9)).toEqual({ dice: '5d4', bonus: 5 });

      expect(magicMissile.calculateDamage(20)).toEqual({ dice: '5d4', bonus: 5 });
    });

    it('should calculate Fireball damage correctly', () => {
      const fireball = new Spell(
        createMockSpell({
          name: 'Fireball',
          description: 'Explodes for 1d6 damage per caster level',
        })
      );

      expect(fireball.calculateDamage(5)).toEqual({ dice: '5d6', bonus: 0 });

      expect(fireball.calculateDamage(10)).toEqual({ dice: '10d6', bonus: 0 });

      expect(fireball.calculateDamage(15)).toEqual({ dice: '10d6', bonus: 0 });
    });

    it('should return null for non-damage spells', () => {
      const utilitySpell = new Spell(
        createMockSpell({
          name: 'Detect Magic',
          description: 'Detects magical auras within range',
        })
      );

      expect(utilitySpell.calculateDamage(10)).toBeNull();
    });
  });

  describe('Command Execution', () => {
    it('should validate command compatibility', () => {
      const spell = new Spell(createMockSpell());

      expect(spell.canExecuteCommand('cast-spell', {})).toBe(true);
      expect(spell.canExecuteCommand('memorize-spell', {})).toBe(true);
      expect(spell.canExecuteCommand('research-spell', {})).toBe(true);
      expect(spell.canExecuteCommand('invalid-command', {})).toBe(false);
    });

    it('should handle spell copying for appropriate classes', () => {
      const magicUserSpell = new Spell(createMockSpell({ class: 'Magic-User' }));
      const illusionistSpell = new Spell(createMockSpell({ class: 'Illusionist' }));
      const clericSpell = new Spell(createMockSpell({ class: 'Cleric' }));

      expect(magicUserSpell.canExecuteCommand('copy-spell', {})).toBe(true);
      expect(illusionistSpell.canExecuteCommand('copy-spell', {})).toBe(true);
      expect(clericSpell.canExecuteCommand('copy-spell', {})).toBe(false);
    });

    it('should throw error for direct command execution', async () => {
      const spell = new Spell(createMockSpell());
      const mockContext = {} as GameContext;

      await expect(spell.executeCommand('cast-spell', {}, mockContext)).rejects.toThrow(
        'Command execution should be handled by the RuleEngine'
      );
    });
  });

  describe('Spell Manipulation', () => {
    it('should update spell properties correctly', () => {
      const originalSpell = new Spell(createMockSpell());
      const updatedSpell = originalSpell.update({
        name: 'Enhanced Magic Missile',
        level: 2,
      });

      expect(originalSpell.name).toBe('Magic Missile');
      expect(originalSpell.level).toBe(1);
      expect(updatedSpell.name).toBe('Enhanced Magic Missile');
      expect(updatedSpell.level).toBe(2);
    });

    it('should create reversed spells when possible', () => {
      const reversibleSpell = new Spell(
        createMockSpell({
          name: 'Cure Light Wounds',
          reversible: true,
        })
      );
      const nonReversibleSpell = new Spell(
        createMockSpell({
          name: 'Magic Missile',
          reversible: false,
        })
      );

      const reversed = reversibleSpell.createReversed();
      expect(reversed).not.toBeNull();
      if (reversed) {
        expect(reversed.name).toBe('Cause Light Wounds');
        expect(reversed.description).toContain('Reversed version of Cure Light Wounds');
      }

      expect(nonReversibleSpell.createReversed()).toBeNull();
    });

    it('should handle special reversed spell names', () => {
      const blessSpell = new Spell(
        createMockSpell({
          name: 'Bless',
          reversible: true,
        })
      );
      const genericSpell = new Spell(
        createMockSpell({
          name: 'Light',
          reversible: true,
        })
      );

      const reversedBless = blessSpell.createReversed();
      const reversedGeneric = genericSpell.createReversed();

      if (reversedBless) {
        expect(reversedBless.name).toBe('Curse');
      }
      if (reversedGeneric) {
        expect(reversedGeneric.name).toBe('Reverse Light');
      }
    });

    it('should provide display information', () => {
      const spell = new Spell(
        createMockSpell({
          name: 'Fireball',
          level: 3,
          class: 'Magic-User',
          components: ['V', 'S', 'M'],
        })
      );

      const display = spell.getDisplayInfo();
      expect(display).toBe('Fireball (Level 3, Magic-User, V, S, M)');
    });

    it('should clone spells correctly', () => {
      const originalSpell = new Spell(createMockSpell());
      const clonedSpell = originalSpell.clone();

      expect(clonedSpell.name).toBe(originalSpell.name);
      expect(clonedSpell.level).toBe(originalSpell.level);
      expect(clonedSpell).not.toBe(originalSpell);
    });
  });

  describe('Factory Methods', () => {
    it('should create spells through factory', () => {
      const spellData = createMockSpell();
      const spell = SpellFactory.create(spellData);

      expect(spell.name).toBe(spellData.name);
      expect(spell.level).toBe(spellData.level);
    });

    it('should create spells from JSON', () => {
      const spellData = createMockSpell();
      const jsonString = JSON.stringify(spellData);
      const spell = SpellFactory.fromJSON(jsonString);

      expect(spell.name).toBe(spellData.name);
      expect(spell.level).toBe(spellData.level);
    });

    it('should validate spell data comprehensively', () => {
      const validSpell = createMockSpell();
      const validation = SpellFactory.validate(validSpell);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum boundary values', () => {
      const minLevelSpell = new Spell(createMockSpell({ level: 1 }));
      expect(minLevelSpell.level).toBe(1);
    });

    it('should handle maximum boundary values', () => {
      const maxLevelSpell = new Spell(createMockSpell({ level: 9 }));
      expect(maxLevelSpell.level).toBe(9);
    });

    it('should handle empty material components', () => {
      const spell = new Spell(
        createMockSpell({
          materialComponents: [],
          components: ['V', 'S'],
        })
      );

      expect(spell.requiresMaterial()).toBe(false);
      expect(spell.materialComponents).toEqual([]);
    });

    it('should handle complex casting time formats', () => {
      const complexSpell = new Spell(createMockSpell({ castingTime: 'Special (see description)' }));
      expect(complexSpell.getCastingTimeValue()).toEqual({ value: 1, unit: 'segment' });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing spell data gracefully', () => {
      const validation = SpellFactory.validate(
        createMockSpell({
          name: '',
          description: '',
          components: [],
        })
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Spell name is required');
      expect(validation.errors).toContain('Spell description is required');
      expect(validation.errors).toContain('Spell must have at least one component');
    });

    it('should handle invalid character classes', () => {
      const spell = new Spell(createMockSpell());

      expect(spell.canBeCastByClass('InvalidClass')).toBe(false);
      expect(spell.canBeCastAtLevel(10, 'InvalidClass')).toBe(false);
    });
  });
});
