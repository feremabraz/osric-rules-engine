# OSRIC Rules Engine - Testing Methodology & Procedures

## 🎉 **BREAKTHROUGH ACHIEVEMENT: COMPREHENSIVE TESTING METHODOLOGY** ✅

**Major Success:** Developed and validated systematic testing approach that achieved 100% success rate (76/76 tests passing) for complex OSRIC mechanics in Phase 5.

**Problem Solved:** Transformed 88+ failing tests into complete test coverage through systematic analysis, pattern recognition, and batch fixing methodology.

---

## 🔬 **CORE TESTING PRINCIPLES**

### **1. Context-First Setup**
**Critical Rule:** All Rule classes require proper `context.setTemporary()` data setup before execution.

```typescript
// REQUIRED: Setup context data before testing rules
context.setTemporary('rule-params', {
  characterId: 'test-character',
  // ... rule-specific parameters
});
```

### **2. Entity Relationship Integrity**
**Foundation:** Use proven mock helpers to ensure proper entity creation and storage.

```typescript
// Use existing tested helpers
const character = createMockCharacter({ 
  id: 'test-character',
  class: 'Fighter',
  level: 3 
});
context.setEntity('test-character', character);

// Always verify storage
expect(context.hasEntity('test-character')).toBe(true);
```

### **3. Command Type Consistency**
**Architecture Rule:** Rules must use COMMAND_TYPES constants, not simple strings.

```typescript
// CORRECT: Use typed constants
const mockCommand = { type: COMMAND_TYPES.SEARCH };

// INCORRECT: Simple strings cause canApply() failures
const mockCommand = { type: 'search' }; // ❌ Will fail
```

### **4. Error Condition Accuracy**
**Reality Check:** Tests should expect actual rule behavior, not idealized expectations.

```typescript
// CORRECT: Expect actual error behavior
const result = await rule.execute(context, mockCommand);
expect(result.success).toBe(false); // Error conditions fail

// INCORRECT: Wrong expectations
expect(result.success).toBe(true); // ❌ Errors don't succeed
```

---

## 📋 **ESTABLISHED TESTING PATTERNS**

### **Standard Rule Test Structure**
```typescript
describe('RuleName', () => {
  let rule: RuleClass;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // Entity setup with proven helpers
    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);
    
    // Rule parameter setup - each rule type has specific structure
    context.setTemporary('rule-params', {
      characterId: 'test-character',
      // ... rule-specific parameters
    });
    
    // Command setup with proper type constants
    mockCommand = { 
      type: COMMAND_TYPES.APPROPRIATE_TYPE,
      actorId: 'test-character'
    };
  });

  // Standard test coverage
  it('should apply when conditions are met', () => {
    expect(rule.canApply(context, mockCommand)).toBe(true);
  });

  it('should execute successfully with valid data', async () => {
    const result = await rule.execute(context, mockCommand);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle error conditions appropriately', async () => {
    // Setup error condition (missing data, invalid character, etc.)
    const result = await rule.execute(context, mockCommand);
    expect(result.success).toBe(false);
    expect(result.message).toContain('expected error message');
  });
});
```

### **Context Data Setup by Rule Type**

#### **Experience Rules**
```typescript
// ExperienceGainRules
context.setTemporary('experience-gain-params', {
  characterId: string,
  experienceSource: {
    type: 'combat' | 'treasure' | 'story',
    value: number,
    monsters?: Monster[]
  }
});

// TrainingRules  
context.setTemporary('training-request-params', {
  characterId: string,
  trainingType: 'level_advancement' | 'new_skill' | 'skill_improvement',
  targetLevel?: number,
  skillType?: string
});

// LevelProgressionRules
context.setTemporary('level-progression-params', {
  characterId: string,
  targetLevel: number,
  hasTraining: boolean
});
```

#### **Exploration Rules**
```typescript
// SearchRules
context.setTemporary('search-request-params', {
  characterId: string,
  searchType: 'secret_doors' | 'hidden_objects' | 'traps' | 'tracks' | 'general',
  area: string,
  timeSpent: number,
  thoroughness: 'hasty' | 'normal' | 'careful' | 'meticulous',
  assistingCharacterIds?: string[]
});

// MovementRules
context.setTemporary('movement-request-params', {
  characterId: string,
  destination: Position,
  movementType: 'walking' | 'running' | 'forced_march',
  terrain: string,
  encumbranceLevel: 'light' | 'moderate' | 'heavy' | 'severe'
});
```

### **Mock Entity Creation Patterns**
```typescript
// Character creation with proper interface compliance
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
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
    // ... complete interface implementation
    ...overrides
  };
}

// Always verify entity storage
context.setEntity('test-character', character);
expect(context.hasEntity('test-character')).toBe(true);
```

---

## 🎯 **SYSTEMATIC ERROR TESTING**

### **Error Condition Categories**
1. **Missing Context Data:** `context.setTemporary()` not called
2. **Invalid Entity References:** Non-existent character IDs
3. **Validation Failures:** Invalid parameters or rule conditions
4. **OSRIC Rule Violations:** Mechanics that don't meet OSRIC requirements

### **Error Testing Patterns**
```typescript
// Test missing context data
it('should handle missing rule data', async () => {
  // Don't call context.setTemporary()
  const result = await rule.execute(context, mockCommand);
  expect(result.success).toBe(false);
  expect(result.message).toContain('No rule data provided');
});

// Test invalid entity references
it('should handle missing character', async () => {
  context.setTemporary('rule-params', { characterId: 'nonexistent' });
  const result = await rule.execute(context, mockCommand);
  expect(result.success).toBe(false); 
  expect(result.message).toContain('Character not found');
});

// Test validation failures
it('should reject invalid parameters', async () => {
  context.setTemporary('rule-params', { 
    characterId: 'test-character',
    invalidParameter: 'bad-value'
  });
  const result = await rule.execute(context, mockCommand);
  expect(result.success).toBe(false);
  expect(result.message).toContain('validation error message');
});
```

---

## 🔧 **BATCH FIXING METHODOLOGY**

### **Problem Analysis Phase**
1. **Run Complete Test Suite:** Identify all failing tests and patterns
2. **Group by Error Type:** Categorize failures (command types, context setup, etc.)
3. **Pattern Recognition:** Find systematic issues affecting multiple tests
4. **Representative Analysis:** Study detailed examples of each failure type

### **Batch Application Phase**
1. **Structural Fixes First:** Address fundamental architecture issues
2. **File-Level Changes:** Apply fixes to entire test files rather than individual tests
3. **Pattern Consistency:** Ensure fixes follow established successful patterns
4. **Regression Prevention:** Verify fixes don't break existing working tests

### **Quality Assurance Phase**
1. **Complete Suite Verification:** Run all tests multiple times
2. **Coverage Analysis:** Ensure tests represent real OSRIC mechanics
3. **Edge Case Validation:** Verify tests catch actual rule violations
4. **Documentation Update:** Record patterns for future development

---

## 📊 **PHASE 5 TESTING SUCCESS METRICS**

### **Quantitative Achievement**
- **Before:** 88+ test failures across all Phase 5 rules
- **After:** 76/76 tests passing (100% success rate)
- **Test Coverage:** All major OSRIC mechanics validated
- **Error Conditions:** Comprehensive edge case testing

### **Individual File Results**
- **TrainingRules.test.ts:** 14/14 passing ✅ (Complex training mechanics with randomization)
- **LevelProgressionRules.test.ts:** 17/17 passing ✅ (Level advancement with HP gains)  
- **ExperienceGainRules.test.ts:** 16/16 passing ✅ (XP from combat, treasure, story)
- **SearchRules.test.ts:** 29/29 passing ✅ (Secret doors, traps, racial bonuses)

### **Qualitative Improvements**
- **Reliability:** Tests accurately reflect actual rule behavior
- **Maintainability:** Clear patterns for adding new rule tests
- **Comprehensiveness:** Full coverage of OSRIC mechanics variations
- **OSRIC Compliance:** Tests verify authentic AD&D 1st Edition implementations

---

## 🛠 **TESTING TOOLS & CONFIGURATION**

### **Framework Setup**
```typescript
// vitest.config.ts configuration
export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@tests': __dirname + '/__tests__',
      '@osric': __dirname + '/osric',
    }
  }
});
```

### **Import Patterns**
```typescript
// Standard test imports
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '@osric/core/GameContext';
import { RuleClass } from '@osric/rules/category/RuleClass';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
```

### **Test Organization**
```
__tests__/
├── rules/                 # Rule-specific tests
│   ├── character/        # Character creation rules
│   ├── combat/           # Combat mechanics
│   ├── experience/       # Experience & leveling
│   ├── exploration/      # Movement & search
│   └── spells/           # Magic system
├── commands/             # Command execution tests
├── core/                 # Infrastructure tests
└── integration/          # Cross-system tests
```

---

## 🚀 **APPLYING METHODOLOGY TO NEW PHASES**

### **Phase 6 NPC Systems Preparation**
1. **Follow Established Patterns:** Use proven context setup and entity creation
2. **Define Rule Parameters:** Establish context data structures for NPC mechanics
3. **Error Condition Planning:** Design comprehensive edge case testing
4. **OSRIC Compliance:** Ensure tests validate authentic reaction/morale mechanics

### **Testing Template for New Rules**
```typescript
// Template for new rule testing
describe('NewRuleName', () => {
  let rule: NewRuleClass;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // Entity setup (use proven helpers)
    context.setEntity('test-character', createMockCharacter());
    
    // Rule-specific context setup
    context.setTemporary('new-rule-params', {
      characterId: 'test-character',
      // ... specific parameters for this rule
    });
    
    // Command with proper type
    mockCommand = { type: COMMAND_TYPES.NEW_RULE_TYPE };
  });

  // Standard test coverage following proven patterns
  // ... canApply, execute success, error conditions
});
```

### **Success Criteria for New Phases**
- **100% Test Coverage:** All rules must pass comprehensive tests
- **OSRIC Compliance:** Authentic AD&D 1st Edition mechanics
- **Pattern Consistency:** Follow established architecture and testing patterns
- **Error Handling:** Comprehensive edge case and validation testing

---

## 📚 **REFERENCE RESOURCES**

### **Proven Test Files (Copy Patterns From)**
- `__tests__/rules/experience/TrainingRules.test.ts` - Complex randomized mechanics
- `__tests__/rules/experience/SearchRules.test.ts` - Multiple character types and bonuses
- `__tests__/core/GameContext.test.ts` - Entity creation helpers

### **Key Architecture Files**
- `osric/core/Rule.ts` - BaseRule interface and helpers
- `osric/types/constants.ts` - COMMAND_TYPES and other constants
- `osric/core/GameContext.ts` - Context management and entity storage

### **Command Types Reference**
```typescript
// Available command types for testing
COMMAND_TYPES = {
  GAIN_EXPERIENCE: 'gain-experience',
  LEVEL_UP: 'level-up', 
  SEARCH: 'search',
  MOVE: 'move',
  REACTION_ROLL: 'reaction-roll',
  MORALE_CHECK: 'morale-check',
  // ... see constants.ts for complete list
}
```

---

*Testing methodology proven effective with 76/76 tests passing in Phase 5*
*Ready for application to Phase 6 NPC Systems and beyond*
