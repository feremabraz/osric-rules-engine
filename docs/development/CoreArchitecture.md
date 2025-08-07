# Core Architecture

## 🎯 **DESIGN PRINCIPLES**

### **1. Command Pattern Foundation**
Commands define **WHAT** should happen, Rules define **HOW** it happens.

```typescript
// Commands delegate logic to Rules
class AttackCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.ATTACK;
  // Implementation delegates to AttackRules
}

// Rules implement OSRIC mechanics
class AttackRoll extends BaseRule {
  // Authentic AD&D 1st Edition attack mechanics
}
```

### **2. Rule Chain Processing**
Rules process in priority-ordered chains, handling complex OSRIC rule interactions systematically.

### **3. Reactive State Management (Jotai)**
RPG rules have deep interconnections requiring reactive updates. UI automatically reacts to rule results without manual synchronization.

---

## 🧩 **CORE COMPONENTS**

### **Infrastructure (`osric/core/`)**
- **GameContext.ts** - Central game state manager with entity storage
- **Rule.ts** - Base interface for all game rules with priority ordering
- **Command.ts** - Base interface for all game actions with validation

### **Entity System (`osric/entities/`)**
- **Immutable Interfaces** - Complete character, monster, spell, item representations
- **Update Pattern** - Immutable updates create new instances

### **Type System (`osric/types/`)**
- **constants.ts** - Strongly typed constants preventing magic strings
- **Strong Typing** - CommandType and RuleType prevent runtime errors

---

## 🔄 **DATA FLOW ARCHITECTURE**

### **Command Execution Flow**
1. UI/Game → Command.execute(context)
2. Command → context.setTemporary(params)  
3. Command → ruleEngine.processCommand()
4. RuleEngine → rule.canApply() + rule.execute()
5. Rule → context.getEntity() / context.setEntity()
6. Rule → return RuleResult
7. Command → return CommandResult
8. UI/Game → react to results

### **Context Communication Pattern**
Commands set temporary data for Rules, Rules retrieve and use data, then update entities immutably.

---
