# Testing Methodology

## 🔬 **CORE TESTING PRINCIPLES**

### **1. Context-First Setup**
All Rule classes require proper `context.setTemporary()` data setup before execution.

```typescript
// REQUIRED: Setup context data before testing rules
context.setTemporary('rule-params', {
  characterId: 'test-character',
  // ... rule-specific parameters
});
```

### **2. Entity Relationship Integrity**
Use proven mock helpers to ensure proper entity creation and storage.

```typescript
const character = createMockCharacter({ 
  id: 'test-character',
  class: 'Fighter',
  level: 3 
});
context.setEntity('test-character', character);
```

### **3. Command Type Consistency**
Rules must use COMMAND_TYPES constants, not simple strings.

```typescript
// CORRECT: Use typed constants
const mockCommand = { type: COMMAND_TYPES.SEARCH };

// INCORRECT: Simple strings cause canApply() failures
const mockCommand = { type: 'search' }; // ❌ Will fail
```

### **4. Error Condition Accuracy**
Tests should expect actual rule behavior, not idealized expectations.

```typescript
// CORRECT: Expect actual error behavior
const result = await rule.execute(context, mockCommand);
expect(result.success).toBe(false); // Error conditions fail
```

---

## 📋 **STANDARD TESTING PATTERNS**

### **Rule Test Template**
```typescript
describe('RuleName', () => {
  let rule: RuleClass;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // Setup infrastructure
    const store = createStore();
    context = new GameContext(store);
    rule = new RuleClass();

    // Entity setup with proven helpers
    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);
    
    // Rule parameter setup - rule-specific structure
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

### **Context Data Patterns by Rule Type**

#### **Experience Rules**
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

#### **Exploration Rules**
```typescript
context.setTemporary('search-request-params', {
  characterId: string,
  searchType: 'secret_doors' | 'hidden_objects' | 'traps',
  area: string,
  timeSpent: number,
  thoroughness: 'hasty' | 'normal' | 'careful' | 'meticulous'
});
```

### **Mock Entity Creation**
```typescript
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: 'Test Character',
    level: 1,
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10,
    },
    hitPoints: { current: 8, maximum: 8 },
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    // ... complete interface implementation
    ...overrides
  };
}
```

---

## 🎯 **SYSTEMATIC ERROR TESTING**

### **Error Condition Categories**
1. **Missing Context Data** - `context.setTemporary()` not called
2. **Invalid Entity References** - Non-existent character IDs
3. **Validation Failures** - Invalid parameters or rule conditions
4. **OSRIC Rule Violations** - Mechanics that don't meet OSRIC requirements

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
```

---

## 🛠 **TESTING CONFIGURATION**

### **Framework Setup**
```typescript
// vitest.config.ts
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

### **Standard Imports**
```typescript
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '@osric/core/GameContext';
import { RuleClass } from '@osric/rules/category/RuleClass';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
```

### **File Organization**
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

## 📊 **SUCCESS METRICS & VALIDATION**

### **Quality Standards**
- **100% Test Pass Rate** - All tests pass consistently
- **Complete Coverage** - All Commands and Rules have test files
- **Error Condition Testing** - All failure modes tested
- **OSRIC Compliance** - All mechanics match AD&D 1st Edition rules
- **Pattern Adherence** - All tests follow established patterns

### **Current Achievement**
- **Total Tests:** 1,090+ passing with 0 failures
- **Phases Complete:** 10 out of 10 core phases (100%)
- **Test Files:** 49+ comprehensive test files
- **Success Rate:** 100% across all implementations

---

## 🚀 **METHODOLOGY APPLICATION**

### **For New Features**
1. **Follow Established Patterns** - Use proven context setup and entity creation
2. **Define Rule Parameters** - Establish context data structures for new mechanics
3. **Error Condition Planning** - Design comprehensive edge case testing
4. **OSRIC Compliance** - Ensure tests validate authentic AD&D mechanics

### **Testing Template for New Rules**
```typescript
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
});
```

---

## 📚 **REFERENCE RESOURCES**

### **Proven Test Files (Copy Patterns From)**
- `__tests__/rules/experience/TrainingRules.test.ts` - Complex randomized mechanics
- `__tests__/rules/exploration/SearchRules.test.ts` - Multiple character types and bonuses
- `__tests__/core/GameContext.test.ts` - Entity creation helpers

### **Key Architecture Files**
- `osric/core/Rule.ts` - BaseRule interface and helpers
- `osric/types/constants.ts` - COMMAND_TYPES and other constants
- `osric/core/GameContext.ts` - Context management and entity storage
