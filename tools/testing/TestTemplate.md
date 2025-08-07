# Test Template for OSRIC Rules Engine

This template provides the standardized structure for creating comprehensive test files in the OSRIC Rules Engine project. It includes all required context setup, mocks, error checks, and OSRIC compliance validation patterns.

## Standard Test File Structure

```typescript
// File: __tests__/[category]/[ComponentName].test.ts
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '@osric/core/GameContext';
import { [COMPONENT_NAME] } from '@osric/[CATEGORY]/[COMPONENT_NAME]';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character, [ADDITIONAL_TYPES] } from '@osric/types/entities';

// TEMPLATE: Mock Character Creation Helper
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    level: 1,
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    hitPoints: { current: 8, maximum: 8 },
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    armorClass: 10,
    thac0: 20,
    savingThrows: {
      paralyzationPoisonDeath: 16,
      rodStaffWand: 18,
      petrificationPolymorph: 17,
      breathWeapon: 20,
      spells: 19,
    },
    equipment: {
      weapons: [],
      armor: null,
      shield: null,
      items: [],
    },
    spells: {
      memorized: [],
      known: [],
      spellSlots: {},
    },
    thiefSkills: null,
    turnUndead: null,
    // Add any component-specific overrides
    ...overrides,
  };
}

// TEMPLATE: Additional Mock Helpers (add as needed)
function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'test-monster',
    name: 'Test Monster',
    hitDice: '1',
    hitPoints: { current: 4, maximum: 4 },
    armorClass: 10,
    thac0: 20,
    attacks: ['1d4'],
    morale: 8,
    treasureType: 'None',
    experienceValue: 10,
    specialAbilities: [],
    ...overrides,
  };
}

describe('[COMPONENT_NAME]', () => {
  let [component_instance]: [COMPONENT_TYPE];
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // CRITICAL: Setup infrastructure
    const store = createStore();
    context = new GameContext(store);
    [component_instance] = new [COMPONENT_NAME]();

    // CRITICAL: Setup test entities
    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);

    // CRITICAL: Setup context data for Rules (COMPONENT_SPECIFIC)
    context.setTemporary('[CONTEXT_DATA_KEY]', {
      characterId: 'test-character',
      // Add component-specific parameters here
      [COMPONENT_SPECIFIC_PARAMS]
    });

    // CRITICAL: Setup command with proper type
    mockCommand = { 
      type: COMMAND_TYPES.[COMMAND_TYPE],
      actorId: 'test-character',
      targetIds: [],
      async execute() { return { success: true, message: 'Mock' }; },
      canExecute: () => true,
      getRequiredRules: () => ['[rule-name]'],
      getInvolvedEntities: () => ['test-character']
    };
  });

  // SECTION: canApply() validation tests (for Rules)
  describe('canApply', () => {
    it('should apply when all conditions are met', () => {
      expect([component_instance].canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply with wrong command type', () => {
      const wrongCommand = { ...mockCommand, type: 'wrong-type' };
      expect([component_instance].canApply(context, wrongCommand)).toBe(false);
    });

    it('should not apply without context data', () => {
      context.setTemporary('[CONTEXT_DATA_KEY]', null);
      expect([component_instance].canApply(context, mockCommand)).toBe(false);
    });

    it('should not apply without required entities', () => {
      context.setTemporary('[CONTEXT_DATA_KEY]', { characterId: 'nonexistent' });
      expect([component_instance].canApply(context, mockCommand)).toBe(false);
    });
  });

  // SECTION: execute() success scenarios
  describe('execute - Success Scenarios', () => {
    it('should execute successfully with valid data', async () => {
      const result = await [component_instance].execute(context, mockCommand);
      
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle standard [COMPONENT_FUNCTION] case', async () => {
      // Setup specific test case
      context.setTemporary('[CONTEXT_DATA_KEY]', {
        characterId: 'test-character',
        // Add specific test parameters
      });

      const result = await [component_instance].execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('[expected success message]');
      // Add component-specific assertions
    });

    // Add additional success scenarios specific to the component
    it('should handle [SPECIFIC_SUCCESS_CASE]', async () => {
      // Component-specific success test
    });
  });

  // SECTION: execute() error scenarios (CRITICAL FOR COMPLETENESS)
  describe('execute - Error Scenarios', () => {
    it('should handle missing context data', async () => {
      // Don't call context.setTemporary() or set to null
      context.setTemporary('[CONTEXT_DATA_KEY]', null);
      
      const result = await [component_instance].execute(context, mockCommand);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No [context] data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('[CONTEXT_DATA_KEY]', { characterId: 'nonexistent' });
      
      const result = await [component_instance].execute(context, mockCommand);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle invalid parameters', async () => {
      context.setTemporary('[CONTEXT_DATA_KEY]', {
        characterId: 'test-character',
        // Add invalid parameter values
        invalidParam: 'invalid-value'
      });

      const result = await [component_instance].execute(context, mockCommand);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('[validation error message]');
    });

    // Add component-specific error scenarios
    it('should handle [SPECIFIC_ERROR_CASE]', async () => {
      // Component-specific error test
    });
  });

  // SECTION: OSRIC compliance validation
  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      // Setup for OSRIC compliance test
      const osricCharacter = createMockCharacter({
        level: 3,
        class: 'Fighter',
        abilities: { strength: 16, dexterity: 12, constitution: 14 }
      });
      context.setEntity('osric-character', osricCharacter);
      
      context.setTemporary('[CONTEXT_DATA_KEY]', {
        characterId: 'osric-character',
        // Add OSRIC-specific test parameters
      });

      const result = await [component_instance].execute(context, mockCommand);

      // Validate authentic OSRIC mechanics
      expect(result.success).toBe(true);
      // Add specific OSRIC rule validations
      // Example: dice table results, modifier calculations, etc.
    });

    it('should use correct OSRIC dice tables and modifiers', async () => {
      // Test specific OSRIC tables and calculations
      // Example: reaction tables, saving throw modifiers, etc.
    });

    it('should respect OSRIC class and level restrictions', async () => {
      // Test class/level specific rules
    });
  });

  // SECTION: Integration testing (if applicable)
  describe('Integration', () => {
    it('should work correctly with related systems', async () => {
      // Test integration with other OSRIC systems
      // Example: experience gain affecting level progression
    });

    it('should maintain entity state consistency', async () => {
      // Test that entity updates are applied correctly
      const result = await [component_instance].execute(context, mockCommand);
      
      if (result.success) {
        const updatedCharacter = context.getEntity<Character>('test-character');
        expect(updatedCharacter).toBeDefined();
        // Add specific state validation
      }
    });
  });

  // SECTION: Edge cases and boundary conditions
  describe('Edge Cases', () => {
    it('should handle minimum boundary values', async () => {
      // Test with minimum valid values
    });

    it('should handle maximum boundary values', async () => {
      // Test with maximum valid values
    });

    it('should handle [COMPONENT_SPECIFIC_EDGE_CASE]', async () => {
      // Component-specific edge case tests
    });
  });
});
```

## Context Data Templates by Category

### Experience Rules
```typescript
context.setTemporary('experience-gain-params', {
  characterId: string,
  experienceSource: {
    type: 'combat' | 'treasure' | 'story',
    value: number,
    monsters?: Monster[]
  }
});
```

### Combat Rules
```typescript
context.setTemporary('attack-params', {
  attackerId: string,
  targetId: string,
  weaponId?: string,
  range?: number,
  circumstances: {
    isSurprised?: boolean,
    isCharging?: boolean,
    isFlanking?: boolean
  }
});
```

### Spell Rules
```typescript
context.setTemporary('spell-casting-params', {
  casterId: string,
  spellId: string,
  targetIds?: string[],
  spellLevel: number,
  components: {
    verbal: boolean,
    somatic: boolean,
    material: boolean
  }
});
```

### Character Rules
```typescript
context.setTemporary('character-action-params', {
  characterId: string,
  actionType: string,
  targetLevel?: number,
  skillType?: string,
  circumstances?: Record<string, any>
});
```

## Critical Testing Requirements

1. **Context Data Setup:** ALWAYS call `context.setTemporary()` with proper parameters
2. **Entity Validation:** Use proven mock helpers, verify entity storage
3. **Command Type Usage:** Use COMMAND_TYPES constants, never strings
4. **Error Testing:** Test missing data, invalid entities, validation failures
5. **OSRIC Compliance:** Verify authentic AD&D mechanics and calculations
6. **Pattern Consistency:** Follow established successful patterns
7. **Complete Coverage:** Test all success scenarios, error conditions, and edge cases

## Template Placeholders

Replace the following placeholders when generating tests:

- `[COMPONENT_NAME]` - Actual component class name
- `[COMPONENT_TYPE]` - Component type (Rule or Command)
- `[CATEGORY]` - Directory category (rules, commands)
- `[COMMAND_TYPE]` - Specific command type constant
- `[CONTEXT_DATA_KEY]` - Context data key for the component
- `[COMPONENT_SPECIFIC_PARAMS]` - Parameters specific to the component
- `[component_instance]` - Variable name for component instance
- `[ADDITIONAL_TYPES]` - Any additional TypeScript types needed

This template ensures 100% test coverage and OSRIC compliance for all components.
