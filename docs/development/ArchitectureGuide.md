# OSRIC Rules Engine - Architecture Guide & Design Decisions

## 🏛️ **CORE ARCHITECTURE OVERVIEW**

**Pattern:** Command Pattern + Rule Chains with Reactive State Management
**Status:** Proven effective through 5 completed phases (324 passing tests)
**Validation:** Successfully handles complex OSRIC mechanics with maintainable patterns

---

## 🎯 **ARCHITECTURAL PRINCIPLES**

### **1. Command Pattern Foundation**
**Decision:** All game actions are Commands that delegate logic to Rules
**Rationale:** Separates what happens (Commands) from how it happens (Rules)
**Benefit:** Modular, testable, and easily extensible for new OSRIC mechanics

```typescript
// Commands define WHAT should happen
class AttackCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.ATTACK;
  // Delegates to Rules for HOW it happens
}

// Rules define HOW things happen
class AttackRoll extends BaseRule {
  // Implements OSRIC attack mechanics
}
```

### **2. Rule Chain Processing**
**Decision:** Rules are processed in chains with priority ordering
**Rationale:** OSRIC mechanics often involve multiple interconnected rules
**Benefit:** Complex rule interactions handled systematically

```typescript
// Attack processing chain example
[
  RangeCheckRule,          // Priority 10 - validate range
  AttackRollRule,          // Priority 20 - roll to hit  
  DamageCalculationRule,   // Priority 30 - calculate damage
  ArmorAbsorptionRule,     // Priority 40 - apply armor
  EffectApplicationRule    // Priority 50 - apply results
]
```

### **3. Reactive State Management (Jotai)**
**Decision:** Use Jotai atoms for reactive state management
**Rationale:** RPG rules have deep interconnections requiring reactive updates
**Benefit:** UI automatically reacts to rule results without manual synchronization

```typescript
// Character HP change automatically triggers:
// - Death saves if HP <= 0
// - Spell effect removal if concentration broken
// - UI updates without additional code
// - Combat status changes
```

---

## 🧩 **COMPONENT ARCHITECTURE**

### **Core Infrastructure (`osric/core/`)**
```typescript
// GameContext.ts - Central game state manager
class GameContext {
  // Entity storage and retrieval
  setEntity<T>(id: string, entity: T): void
  getEntity<T>(id: string): T | null
  
  // Temporary data for Rule communication
  setTemporary(key: string, value: unknown): void
  getTemporary<T>(key: string): T | null
  
  // Rule execution coordination
  getRuleEngine(): RuleEngine
}

// Rule.ts - Base interface for all game rules
interface Rule {
  readonly name: string;
  readonly priority: number;
  canApply(context: GameContext, command: Command): boolean;
  execute(context: GameContext, command: Command): Promise<RuleResult>;
}

// Command.ts - Base interface for all game actions  
interface Command {
  readonly type: string;
  execute(context: GameContext): Promise<CommandResult>;
  canExecute(context: GameContext): boolean;
  getRequiredRules(): string[];
}
```

### **Entity System (`osric/entities/`)**
```typescript
// Immutable entity interfaces
interface Character {
  readonly id: string;
  readonly name: string;
  readonly race: Race;
  readonly class: CharacterClass;
  readonly level: number;
  readonly abilities: AbilityScores;
  readonly hitPoints: { current: number; maximum: number };
  // ... complete character representation
}

// Entities are immutable - updates create new instances
const updatedCharacter = { ...character, hitPoints: newHP };
context.setEntity(character.id, updatedCharacter);
```

### **Type System (`osric/types/`)**
```typescript
// constants.ts - Strongly typed constants
export const COMMAND_TYPES = {
  ATTACK: 'attack',
  CAST_SPELL: 'cast-spell',
  SEARCH: 'search',
  // ... all command types
} as const;

export const RULE_NAMES = {
  ATTACK_ROLL: 'attack-roll',
  DAMAGE_CALCULATION: 'damage-calculation', 
  SEARCH_MECHANICS: 'search-mechanics',
  // ... all rule names
} as const;

// Strong typing prevents magic strings
type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];
```

---

## 🔄 **DATA FLOW ARCHITECTURE**

### **Command Execution Flow**
```
1. UI/Game → Command.execute(context)
2. Command → context.setTemporary(params)  
3. Command → ruleEngine.processCommand()
4. RuleEngine → rule.canApply() for each rule
5. RuleEngine → rule.execute() for applicable rules
6. Rule → context.getEntity() / context.setEntity()
7. Rule → return RuleResult
8. RuleEngine → aggregate results
9. Command → return CommandResult  
10. UI/Game → react to results
```

### **Context Data Communication**
```typescript
// Commands set temporary data for Rules
context.setTemporary('attack-params', {
  attackerId: 'character-1',
  targetId: 'monster-1', 
  weaponId: 'sword-1',
  range: 5
});

// Rules retrieve and use the data
const attackData = context.getTemporary<AttackParams>('attack-params');
const attacker = context.getEntity<Character>(attackData.attackerId);
```

### **Entity Update Pattern**
```typescript
// Rules update entities immutably
const character = context.getEntity<Character>(characterId);
const updatedCharacter = {
  ...character,
  hitPoints: { ...character.hitPoints, current: newHP },
  experience: { ...character.experience, current: newXP }
};
context.setEntity(characterId, updatedCharacter);
```

---

## 🎮 **OSRIC-SPECIFIC DESIGN DECISIONS**

### **1. Metric Conversion Standard**
**Decision:** All OSRIC measurements converted to metric (1" = 3m)
**Rationale:** Consistent modern measurement system
**Implementation:** Conversion handled at rule level, transparent to users

```typescript
// Movement rates converted from inches to meters
const movementRate = osricMovement * 3; // 12" becomes 36m
const spellRange = osricRange * 3;       // 60" becomes 180m
```

### **2. Abstract Positioning System**
**Decision:** Grid-agnostic positioning system
**Rationale:** Games can choose hex, square, or custom grids
**Benefit:** Flexible for different game implementations

```typescript
interface Position {
  x: number;
  y: number; 
  z?: number; // Multi-level support
}

interface GridSystem {
  getDistance(from: Position, to: Position): number;
  getNeighbors(pos: Position): Position[];
  // Game chooses implementation
}
```

### **3. No Database Dependencies**
**Decision:** Pure TypeScript data structures, no Prisma/database
**Rationale:** Avoid scope creep, focus on rules engine
**Benefit:** Zero external dependencies, pure game logic

```typescript
// Game state in memory with optional persistence
interface GameState {
  characters: Map<string, Character>;
  monsters: Map<string, Monster>;
  items: Map<string, Item>;
  spells: Map<string, Spell>;
}
```

---

## 🧠 **DESIGN PATTERN DETAILS**

### **BaseRule Pattern**
```typescript
export abstract class BaseRule implements Rule {
  abstract readonly name: string;
  readonly priority: number = 100;

  // Template method pattern
  abstract execute(context: GameContext, command: Command): Promise<RuleResult>;
  abstract canApply(context: GameContext, command: Command): boolean;

  // Helper methods for common operations
  protected createSuccessResult(message: string, data?: any): RuleResult {
    return { success: true, message, data };
  }

  protected createFailureResult(message: string): RuleResult {
    return { success: false, message };
  }

  protected getTemporaryData<T>(context: GameContext, key: string): T | null {
    return context.getTemporary<T>(key);
  }
}
```

### **BaseCommand Pattern**
```typescript
export abstract class BaseCommand implements Command {
  abstract readonly type: string;

  constructor(
    protected readonly actorId: string,
    protected readonly targetIds: string[] = []
  ) {}

  async execute(context: GameContext): Promise<CommandResult> {
    // 1. Validate entities
    if (!this.validateEntities(context)) {
      return this.createFailureResult('Invalid entities');
    }

    // 2. Set context data for Rules
    this.setupContextData(context);

    // 3. Delegate to RuleEngine
    const ruleEngine = context.getRuleEngine();
    return await ruleEngine.processCommand(this, context);
  }

  protected abstract setupContextData(context: GameContext): void;
}
```

### **RuleChain Pattern**
```typescript
class RuleChain {
  constructor(private rules: Rule[] = []) {
    // Sort by priority for consistent execution order
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  async execute(context: GameContext, command: Command): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    
    for (const rule of this.rules) {
      if (rule.canApply(context, command)) {
        const result = await rule.execute(context, command);
        results.push(result);
        
        // Stop chain if rule requests it
        if (result.stopChain) break;
      }
    }
    
    return results;
  }
}
```

---

## 🔧 **EXTENSIBILITY ARCHITECTURE**

### **Adding New Rule Types**
```typescript
// 1. Add constants
COMMAND_TYPES.NEW_ACTION = 'new-action';
RULE_NAMES.NEW_RULE = 'new-rule';

// 2. Create Rule class
class NewRule extends BaseRule {
  readonly name = RULE_NAMES.NEW_RULE;
  // Implement OSRIC mechanics
}

// 3. Create Command class
class NewActionCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.NEW_ACTION;
  // Delegate to Rules
}

// 4. Register with RuleEngine
ruleEngine.registerRule(new NewRule());
```

### **Custom Grid Systems**
```typescript
// Implement custom grid logic
class CustomGrid implements GridSystem {
  getDistance(from: Position, to: Position): number {
    // Custom distance calculation
  }
  
  getNeighbors(pos: Position): Position[] {
    // Custom neighbor logic
  }
}

// Use in MovementCalculator
const calculator = new MovementCalculator(new CustomGrid());
```

### **State Management Extensions**
```typescript
// Create custom atoms for new game mechanics
const territoryAtom = atom(new Map<string, Territory>());
const weatherAtom = atom<Weather>({ type: 'clear', temperature: 20 });

// Rules can read/write atoms reactively
class WeatherRule extends BaseRule {
  execute(context: GameContext) {
    const weather = context.getAtom(weatherAtom);
    // Weather affects movement, spell casting, etc.
  }
}
```

---

## 📊 **PERFORMANCE ARCHITECTURE**

### **Efficient Rule Processing**
```typescript
// Rules only execute when applicable
class AttackRoll extends BaseRule {
  canApply(context: GameContext, command: Command): boolean {
    // Fast checks before expensive execution
    return command.type === COMMAND_TYPES.ATTACK &&
           context.hasEntity(command.actorId) &&
           this.getTemporaryData(context, 'attack-params') !== null;
  }
}
```

### **Immutable Entity Updates**
```typescript
// Structural sharing for performance
const updatedCharacter = {
  ...character,
  abilities: {
    ...character.abilities,
    strength: newStrength // Only strength changed
  }
};
```

### **Context Data Optimization**
```typescript
// Temporary data cleared after command execution
context.setTemporary('command-data', params);
await ruleEngine.processCommand(command, context);
context.clearTemporary('command-data'); // Prevent memory leaks
```

---

## 🏗️ **INTEGRATION ARCHITECTURE**

### **React Game Integration**
```typescript
// Jotai atoms provide reactive state
const characterAtom = atom(character);
const combatStateAtom = atom(combatState);

// UI components automatically update
function CharacterSheet() {
  const character = useAtomValue(characterAtom);
  return <div>HP: {character.hitPoints.current}</div>;
}

// Rules update atoms, UI reacts
class DamageRule extends BaseRule {
  execute(context: GameContext) {
    // Update character HP
    // UI automatically reflects change
  }
}
```

### **External System Integration**
```typescript
// Plugin architecture for external systems
interface ExternalPlugin {
  onRuleExecuted(rule: Rule, result: RuleResult): void;
  onCommandCompleted(command: Command, result: CommandResult): void;
}

// Logging, analytics, save systems, etc.
class SaveGamePlugin implements ExternalPlugin {
  onCommandCompleted(command: Command, result: CommandResult) {
    if (result.success) {
      this.saveGameState();
    }
  }
}
```

---

## 🎯 **ARCHITECTURE VALIDATION**

### **Proven Through Implementation**
- **5 Completed Phases:** Character creation, Combat, Magic, Experience, Movement
- **324 Passing Tests:** Comprehensive validation of patterns
- **Complex Mechanics:** THAC0, spell memorization, multi-class progression
- **OSRIC Compliance:** Authentic AD&D 1st Edition rules

### **Scalability Evidence**
- **Consistent Patterns:** Each new phase follows same architecture
- **No Breaking Changes:** New features don't require existing rewrites
- **Test Coverage:** 100% success rates achievable with established patterns
- **Maintainability:** Clear separation of concerns and responsibilities

---

## 🚀 **FUTURE ARCHITECTURE CONSIDERATIONS**

### **Planned Enhancements**
- **Plugin System:** External integrations for save/load, networking, etc.
- **Rule Scripting:** Dynamic rule loading for custom campaigns
- **Performance Optimization:** Rule caching and batch processing
- **Type Safety:** Enhanced compile-time validation

### **Architecture Stability**
- **Core Patterns Locked:** Command/Rule pattern proven and stable
- **Interface Consistency:** New features follow established interfaces
- **Backward Compatibility:** Existing code continues to work
- **Documentation:** Comprehensive guides for maintainable development

---

*Architecture proven through 5 phases, 324 tests, and comprehensive OSRIC implementation*
*Ready to support complete AD&D 1st Edition rules library*
