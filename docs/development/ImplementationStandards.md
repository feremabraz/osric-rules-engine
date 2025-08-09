# Implementation Standards & Patterns

## ⚙️ **COMMAND IMPLEMENTATION PATTERN**

### **Standard Command Structure**
```typescript
// Template: /osric/commands/category/ActionCommand.ts
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
    return await ruleEngine.processCommand(this, context);
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['action-validation', 'action-execution'];
  }
}
```

**Key Requirements:**
1. Use COMMAND_TYPES constants
2. Set temporary data for Rules
3. Validate entities before execution
4. Delegate logic to RuleEngine
5. Convert RuleResult to CommandResult

---

## 🧠 **RULE IMPLEMENTATION PATTERN**

### **Standard Rule Structure**
```typescript
// Template: /osric/rules/category/ActionRules.ts
export class ActionRule extends BaseRule {
  readonly name = RULE_NAMES.ACTION_RULE;
  readonly priority = 100;

  canApply(context: GameContext, command: Command): boolean {
    // 1. Check command type
    if (!this.isCommandType(command, COMMAND_TYPES.ACTION_TYPE)) {
      return false;
    }

    // 2. Check required data exists
    const actionData = this.getRequiredContext<ActionParams>(context, 'action-params');
    if (!actionData) {
      return false;
    }

    // 3. Check character exists
    return context.hasEntity(actionData.characterId);
  }

  async execute(context: GameContext, command: Command): Promise<RuleResult> {
    // 1. Get and validate data
    const actionData = this.getRequiredContext<ActionParams>(context, 'action-params');
    const character = context.getEntity<Character>(actionData.characterId);
    
    if (!actionData || !character) {
      return this.createFailureResult('Required data not found');
    }

    // 2. Apply OSRIC mechanics
    try {
      const result = this.performOSRICAction(character, actionData);
      
      // 3. Update entities if needed
      if (result.characterUpdates) {
        context.setEntity(character.id, { ...character, ...result.characterUpdates });
      }

      return this.createSuccessResult(result.message, result.data);
    } catch (error) {
      return this.createFailureResult(`Action failed: ${error.message}`);
    }
  }

  private performOSRICAction(character: Character, params: ActionParams): ActionResult {
    // Implement actual OSRIC mechanics here
  }
}
```

**Key Requirements:**
1. Use RULE_NAMES constants
2. Implement comprehensive canApply() logic
3. Validate temporary data and entities
4. Apply authentic OSRIC mechanics
5. Handle errors gracefully
6. Update entities immutably

---

## 📁 **FILE ORGANIZATION STANDARDS**

### **Directory Structure**
```
osric/
├── commands/
│   ├── character/        # Character-related actions
│   ├── combat/           # Combat actions
│   ├── exploration/      # Movement and exploration
│   ├── spells/           # Magic system
│   └── npc/              # NPC interactions
├── rules/
│   ├── character/        # Character mechanics
│   ├── combat/           # Combat rules
│   ├── experience/       # Experience and leveling
│   ├── exploration/      # Movement and search
│   ├── spells/           # Magic system rules
│   └── npc/              # NPC behavior rules
├── core/                 # Infrastructure
├── entities/             # Game entities
└── types/                # TypeScript interfaces
```

### **Naming Conventions**
- **Commands:** `ActionCommand.ts`
- **Rules:** `ActionRules.ts`
- **Tests:** `ActionRules.test.ts`
- **Types:** `ActionTypes.ts`
- **Constants:** Added to existing `constants.ts`

---

## 🎮 **OSRIC IMPLEMENTATION GUIDELINES**

### **Authentic Mechanics Requirements**
1. **Rule Fidelity** - Implement exact OSRIC/AD&D 1st Edition mechanics
2. **Edge Case Handling** - Cover all rule variations and special cases
3. **Metric Conversion** - Convert measurements using 1" = 3m standard
4. **Table Implementation** - Use exact dice tables and probability distributions

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

## 🚀 **DEVELOPMENT WORKFLOW**

### **Implementation Process**
1. **Constants First** - Add new COMMAND_TYPES and RULE_NAMES
2. **Types & Interfaces** - Define parameter structures and result types
3. **Rules Implementation** - Create Rule classes with OSRIC mechanics
4. **Commands Implementation** - Create Command classes that delegate to Rules
5. **Testing** - Apply comprehensive testing methodology
6. **Validation** - Ensure OSRIC compliance and 100% test coverage

---

## 📚 **REFERENCE PATTERNS**

### **Successful Implementation Examples**
- **SearchRules.ts** - Complex mechanics with multiple character types
- **TrainingRules.ts** - Randomized success with cost calculations
- **ExperienceGainRules.ts** - Multiple XP sources with party sharing
- **LevelProgressionRules.ts** - Multi-step advancement with validation

### **Testing Success Examples**
- **SearchRules.test.ts** - 29/29 tests with comprehensive coverage
- **TrainingRules.test.ts** - 14/14 tests with complex randomized mechanics
- **ExperienceGainRules.test.ts** - 16/16 tests with multiple XP sources
