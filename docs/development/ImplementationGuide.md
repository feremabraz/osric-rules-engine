# OSRIC Rules Engine - Implementation Guide & Procedures

## 🏗️ **ESTABLISHED ARCHITECTURE PATTERNS**

**Status:** Architecture proven effective through 5 completed phases with 324 passing tests
**Core Pattern:** Command Pattern + Rule Chains with Jotai state management
**Validation:** All patterns validated through comprehensive OSRIC mechanics implementation

---

## 🎯 **COMMAND IMPLEMENTATION PATTERN**

### **Step 1: Command Structure**
All Commands follow the BaseCommand pattern with specific requirements:

```typescript
// Template: /osric/commands/category/ActionCommand.ts
import { BaseCommand, type CommandResult } from '@osric/core/Command';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { GameContext } from '@osric/core/GameContext';

export class ActionCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.ACTION_TYPE;

  constructor(
    actorId: string,
    private readonly actionParams: ActionParams,
    targetIds: string[] = []
  ) {
    super(actorId, targetIds);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    // 1. Validate entities exist
    if (!this.validateEntities(context)) {
      return this.createFailureResult('Required entities not found');
    }

    // 2. Set up context data for Rules
    context.setTemporary('action-params', {
      characterId: this.actorId,
      ...this.actionParams
    });

    // 3. Delegate to RuleEngine
    const ruleEngine = context.getRuleEngine();
    const ruleResult = await ruleEngine.processCommand(this, context);

    // 4. Convert RuleResult to CommandResult
    return {
      success: ruleResult.success,
      message: ruleResult.message,
      data: ruleResult.data,
      effects: ruleResult.effects,
      damage: ruleResult.damage
    };
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['action-validation', 'action-execution'];
  }
}
```

### **Key Command Requirements:**
1. **Type Constants:** Must use COMMAND_TYPES from constants.ts
2. **Context Setup:** Set temporary data for Rules to consume
3. **Entity Validation:** Always validate required entities exist
4. **Rule Delegation:** Let RuleEngine handle the actual logic
5. **Result Conversion:** Transform RuleResult to CommandResult

---

## ⚙️ **RULE IMPLEMENTATION PATTERN**

### **Step 1: Rule Structure**
All Rules follow the BaseRule pattern with OSRIC-specific requirements:

```typescript
// Template: /osric/rules/category/ActionRules.ts
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { Character } from '@osric/types/entities';

export class ActionRule extends BaseRule {
  readonly name = RULE_NAMES.ACTION_RULE;
  readonly priority = 100; // Adjust based on execution order needs

  canApply(context: GameContext, command: Command): boolean {
    // 1. Check command type
    if (!this.isCommandType(command, COMMAND_TYPES.ACTION_TYPE)) {
      return false;
    }

    // 2. Check required data exists
    const actionData = this.getTemporaryData<ActionParams>(context, 'action-params');
    if (!actionData) {
      return false;
    }

    // 3. Check character exists
    return context.hasEntity(actionData.characterId);
  }

  async execute(context: GameContext, command: Command): Promise<RuleResult> {
    // 1. Get and validate data
    const actionData = this.getTemporaryData<ActionParams>(context, 'action-params');
    if (!actionData) {
      return this.createFailureResult('No action data provided');
    }

    const character = context.getEntity<Character>(actionData.characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    // 2. Apply OSRIC mechanics
    try {
      const result = this.performOSRICAction(character, actionData);
      
      // 3. Update entities if needed
      if (result.characterUpdates) {
        context.setEntity(character.id, { ...character, ...result.characterUpdates });
      }

      // 4. Return success result
      return this.createSuccessResult(
        result.message,
        result.data,
        result.effects,
        result.damage
      );
    } catch (error) {
      return this.createFailureResult(`Action failed: ${error.message}`);
    }
  }

  private performOSRICAction(character: Character, params: ActionParams): ActionResult {
    // Implement actual OSRIC mechanics here
    // This is where the AD&D 1st Edition rules logic goes
  }
}
```

### **Key Rule Requirements:**
1. **Rule Names:** Must use RULE_NAMES constants
2. **canApply Logic:** Check command type, data existence, entity availability
3. **Data Validation:** Always validate temporary data and entities
4. **OSRIC Compliance:** Implement authentic AD&D 1st Edition mechanics
5. **Error Handling:** Comprehensive validation and error messages
6. **Entity Updates:** Modify entities through context.setEntity()

---

## 🧪 **TESTING IMPLEMENTATION PATTERN**

### **Step 1: Test File Structure**
Follow the proven methodology from Phase 5 successes:

```typescript
// Template: /__tests__/rules/category/ActionRules.test.ts
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '@osric/core/GameContext';
import { ActionRule } from '@osric/rules/category/ActionRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';

// Helper function for mock character creation
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char',
    name: 'Test Character',
    // ... complete Character interface implementation
    ...overrides
  };
}

describe('ActionRule', () => {
  let rule: ActionRule;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // Setup infrastructure
    const store = createStore();
    context = new GameContext(store);
    rule = new ActionRule();

    // Setup test character
    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);

    // Setup context data (CRITICAL)
    context.setTemporary('action-params', {
      characterId: 'test-character',
      // ... action-specific parameters
    });

    // Setup command with proper type
    mockCommand = { 
      type: COMMAND_TYPES.ACTION_TYPE,
      actorId: 'test-character',
      targetIds: [],
      async execute() { return { success: true, message: 'Mock' }; },
      canExecute: () => true,
      getRequiredRules: () => ['action-rule'],
      getInvolvedEntities: () => ['test-character']
    };
  });

  describe('canApply', () => {
    it('should apply when conditions are met', () => {
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply with wrong command type', () => {
      const wrongCommand = { ...mockCommand, type: 'wrong-type' };
      expect(rule.canApply(context, wrongCommand)).toBe(false);
    });

    it('should not apply without context data', () => {
      context.setTemporary('action-params', null);
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid data', async () => {
      const result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle missing context data', async () => {
      context.setTemporary('action-params', null);
      const result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No action data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('action-params', { characterId: 'nonexistent' });
      const result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    // Add OSRIC-specific test cases
    it('should validate OSRIC mechanics', async () => {
      // Test specific OSRIC rules and edge cases
    });
  });
});
```

### **Critical Testing Requirements:**
1. **Context Data Setup:** Always call `context.setTemporary()` with proper parameters
2. **Entity Creation:** Use proven mock helpers, don't create entities manually
3. **Command Types:** Use COMMAND_TYPES constants, never strings
4. **Error Testing:** Test missing data, invalid entities, validation failures
5. **OSRIC Validation:** Test authentic AD&D mechanics and edge cases

---

## 📁 **FILE ORGANIZATION PATTERN**

### **Directory Structure**
```
osric/
├── commands/
│   ├── character/        # Character-related actions
│   ├── combat/           # Combat actions
│   ├── exploration/      # Movement and exploration
│   ├── spells/           # Magic system
│   └── npc/              # NPC interactions (Phase 6)
├── rules/
│   ├── character/        # Character creation and progression
│   ├── combat/           # Combat mechanics
│   ├── experience/       # Experience and leveling
│   ├── exploration/      # Movement and search
│   ├── spells/           # Magic system rules
│   └── npc/              # NPC behavior rules (Phase 6)
├── core/                 # Infrastructure (Rule, Command, GameContext)
├── entities/             # Game entities (Character, Monster, etc.)
└── types/                # TypeScript interfaces and constants
```

### **Naming Conventions**
- **Commands:** `ActionCommand.ts` (action + Command suffix)
- **Rules:** `ActionRules.ts` (action + Rules suffix)  
- **Tests:** `ActionRules.test.ts` (matches rule filename)
- **Types:** `ActionTypes.ts` (specific interfaces)
- **Constants:** Added to existing `constants.ts`

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Phase Implementation Process**

#### **Step 1: Planning & Design**
1. **Identify OSRIC Mechanics:** Research specific AD&D 1st Edition rules
2. **Define Components:** List required Commands, Rules, and data structures
3. **Plan Integration:** Consider interactions with existing systems
4. **Design Tests:** Plan comprehensive test coverage including edge cases

#### **Step 2: Implementation**
1. **Constants First:** Add new COMMAND_TYPES and RULE_NAMES to constants.ts
2. **Types & Interfaces:** Define parameter structures and result types
3. **Rules Implementation:** Create Rule classes with OSRIC mechanics
4. **Commands Implementation:** Create Command classes that delegate to Rules
5. **Integration Points:** Update RuleEngine and other systems as needed

#### **Step 3: Testing**
1. **Rule Tests First:** Test Rules in isolation with comprehensive coverage
2. **Command Tests:** Test Command execution and integration
3. **Integration Tests:** Test cross-system interactions
4. **OSRIC Validation:** Verify authentic AD&D mechanics implementation
5. **Edge Cases:** Test boundary conditions and error scenarios

#### **Step 4: Validation**
1. **Complete Test Suite:** Ensure 100% test coverage and passing
2. **Code Review:** Verify patterns follow established architecture
3. **OSRIC Compliance:** Validate against original AD&D rules
4. **Performance Check:** Ensure efficient execution for real-time use

---

## 🎯 **OSRIC IMPLEMENTATION GUIDELINES**

### **Authentic Mechanics Requirements**
1. **Rule Fidelity:** Implement exact OSRIC/AD&D 1st Edition mechanics
2. **Edge Case Handling:** Cover all rule variations and special cases
3. **Metric Conversion:** Convert all measurements using 1" = 3m standard
4. **Table Implementation:** Use exact dice tables and probability distributions
5. **Integration Respect:** Honor existing system interactions and dependencies

### **Common OSRIC Patterns**
```typescript
// Ability Score Checks (roll under)
function abilityCheck(score: number, modifier: number = 0): boolean {
  const roll = rollD20();
  return roll <= (score + modifier);
}

// Saving Throws (roll over)
function savingThrow(target: number, modifier: number = 0): boolean {
  const roll = rollD20();
  return roll >= (target - modifier);
}

// Percentage Rolls (roll under)
function percentageCheck(chance: number): boolean {
  const roll = rollD100();
  return roll <= chance;
}

// Table Lookups with 2d6
function reactionRoll(charismaModifier: number): string {
  const roll = roll2D6() + charismaModifier;
  if (roll <= 2) return 'Hostile';
  if (roll <= 5) return 'Unfriendly';
  if (roll <= 8) return 'Neutral';
  if (roll <= 11) return 'Friendly';
  return 'Enthusiastic';
}
```

---

## 🚀 **PHASE 6 NPC SYSTEMS - IMPLEMENTATION ROADMAP**

### **Required Components**

#### **1. ReactionRollCommand & ReactionRules**
```typescript
// Context data structure
interface ReactionParams {
  characterId: string;           // Acting character
  npcId?: string;               // Specific NPC (optional)
  partyRepresentative: boolean; // Is character speaking for party?
  situationalModifiers: {       // Contextual adjustments
    gifts?: number;             // Value of gifts offered
    threats?: number;           // Intimidation attempts
    reputation?: number;        // Known reputation modifier
    language?: boolean;         // Can communicate effectively
  };
}

// OSRIC mechanics to implement
- 2d6 reaction table with Charisma modifiers
- Situational adjustments (gifts, threats, etc.)
- Party representation rules
- Context-sensitive reactions
```

#### **2. MoraleCheckCommand & MoraleRules**
```typescript
// Context data structure  
interface MoraleParams {
  characterId: string;          // Leader or individual
  groupIds?: string[];          // Group being tested
  trigger: 'damage' | 'leader_death' | 'overwhelming_odds' | 'other';
  situationalModifiers: {
    leadershipBonus?: number;   // Leader's Charisma modifier
    eliteUnit?: boolean;        // Professional soldiers
    cornered?: boolean;         // No retreat possible
    overwhelming?: boolean;     // Facing impossible odds
  };
}

// OSRIC mechanics to implement
- Morale rating by creature type
- Trigger conditions and timing
- Leadership effects
- Rally attempts and recovery
```

#### **3. LoyaltyCheckCommand & LoyaltyRules**
```typescript
// Context data structure
interface LoyaltyParams {
  henchmanId: string;           // Henchman being tested
  lordId: string;               // Player character leader
  trigger: 'danger' | 'treasure' | 'treatment' | 'mission';
  testModifiers: {
    charismaBonus: number;      // Leader's Charisma modifier
    treatmentHistory: number;   // Past treatment effects
    sharedDanger: number;       // Adventures together
    treasureShare: number;      // Fair share of treasure
  };
}

// OSRIC mechanics to implement
- Base loyalty by Charisma
- Treatment and experience modifiers
- Loyalty test triggers
- Consequences of failed loyalty
```

### **Implementation Order**
1. **ReactionRules** - Foundation for NPC interactions
2. **MoraleRules** - Combat and encounter behavior
3. **LoyaltyRules** - Henchman and follower management
4. **Integration Testing** - Cross-system validation
5. **Comprehensive Testing** - 100% coverage goal

---

## 📚 **REFERENCE PATTERNS**

### **Successful Implementation Examples**
- **SearchRules.ts:** Complex mechanics with multiple character types and bonuses
- **TrainingRules.ts:** Randomized success rates with cost calculations
- **ExperienceGainRules.ts:** Multiple XP sources with party sharing
- **LevelProgressionRules.ts:** Multi-step advancement with validation

### **Testing Success Examples**
- **SearchRules.test.ts:** 29/29 tests passing with comprehensive coverage
- **TrainingRules.test.ts:** 14/14 tests with complex randomized mechanics
- **ExperienceGainRules.test.ts:** 16/16 tests with multiple XP sources

### **Architecture Reference Files**
- **BaseRule.ts:** Rule interface and helper methods
- **BaseCommand.ts:** Command interface and patterns
- **constants.ts:** All type constants and naming conventions
- **GameContext.ts:** Entity management and temporary data

---

*Implementation guide based on 5 successful phases with 324 passing tests*
*Ready for Phase 6 NPC Systems and beyond following proven patterns*
