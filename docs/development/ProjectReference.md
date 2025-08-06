# OSRIC Rules Engine - Project Reference & Quick Guide

## 📋 **PROJECT OVERVIEW**

**Type:** Complete OSRIC AD&D 1st Edition rules library
**Target:** Personal React-TypeScript game development  
**Architecture:** Command Pattern + Rule Chains + Jotai state management
**Status:** 5 phases completed, 324 tests passing ✅
**Active Codebase:** `osric/` directory (modern patterns)
**Legacy Reference:** `rules/` directory (deprecated, reference only)

---

## 🎯 **SCOPE DEFINITION**

### **✅ IN SCOPE**
- Complete OSRIC mechanics as TypeScript library
- Abstract positioning system (grid-agnostic)
- Metric unit conversion (1" = 3m standard)
- Data structures for all game entities
- Reactive state management for React games
- Comprehensive test coverage (100% target)

### **❌ OUT OF SCOPE**
- UI components or React helpers
- Database integration or Prisma
- Deployment tools or infrastructure
- Complex spatial map management
- Real-time multiplayer or WebSocket integration
- Visual game engine or rendering

---

## 🏗️ **ARCHITECTURE QUICK REFERENCE**

### **Core Pattern**
```typescript
// Commands define WHAT happens
class AttackCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.ATTACK;
  // Delegates to Rules
}

// Rules define HOW it happens  
class AttackRule extends BaseRule {
  readonly name = RULE_NAMES.ATTACK_ROLL;
  // Implements OSRIC mechanics
}
```

### **Directory Structure**
```
osric/ (ACTIVE)
├── commands/    # Game actions (Commands)
├── rules/       # Game mechanics (Rules)  
├── core/        # Infrastructure
├── entities/    # Game objects
└── types/       # TypeScript interfaces

rules/ (LEGACY)  # Reference only, do not modify
```

### **Key Files**
- **`osric/core/Rule.ts`** - BaseRule interface and helpers
- **`osric/core/Command.ts`** - BaseCommand interface  
- **`osric/core/GameContext.ts`** - Central state management
- **`osric/types/constants.ts`** - All typed constants
- **`vitest.config.ts`** - Testing configuration with path aliases

---

## ✅ **COMPLETED SYSTEMS**

### **Phase 1: Core Infrastructure** ✅
- **Location:** `osric/core/`
- **Components:** Command Pattern, Rule Chains, GameContext, Entity wrappers
- **Status:** Stable foundation, no changes needed

### **Phase 2: Character Creation** ✅
- **Location:** `osric/commands/character/`, `osric/rules/character/`
- **Features:** All races, classes, ability scores, multi-class rules
- **OSRIC Coverage:** Complete character generation mechanics

### **Phase 3: Combat System** ✅
- **Location:** `osric/commands/combat/`, `osric/rules/combat/`
- **Features:** THAC0, damage, initiative, grappling, specialization, mounted combat
- **OSRIC Coverage:** Complete combat mechanics

### **Phase 4: Magic System** ✅
- **Location:** `osric/commands/spells/`, `osric/rules/spells/`
- **Features:** Spell casting, memorization, progression, magic items, scrolls, research
- **OSRIC Coverage:** Complete spell system

### **Phase 5: Experience & Movement** ✅ **RECENT COMPLETION**
- **Location:** `osric/commands/character/`, `osric/commands/exploration/`, `osric/rules/experience/`, `osric/rules/exploration/`
- **Features:** XP gain, level progression, training, movement rates, search mechanics
- **Test Results:** 76/76 passing (100% success rate)
- **Achievement:** Comprehensive testing methodology established

---

## 🔄 **CURRENT PRIORITIES**

### **Phase 6: NPC Systems** (ACTIVE DEVELOPMENT)
- **Priority:** Highest - Critical for gameplay
- **Components:** Reaction rolls, morale checks, loyalty mechanics
- **Location:** `osric/commands/npc/`, `osric/rules/npc/`
- **Status:** Ready to implement following established patterns

### **Remaining Phases** (Planned)
1. **Phase 7:** Thief Skills (pick locks, find traps)
2. **Phase 8:** Saving Throws (all class/level tables)
3. **Phase 9:** Turn Undead (cleric mechanics)
4. **Phase 10:** Environmental Hazards (falling, drowning, temperature)

---

## 🧪 **TESTING REFERENCE**

### **Test Configuration**
```typescript
// vitest.config.ts aliases
'@tests': __tests__ directory
'@osric': osric source directory  
'@osric/core': core classes
'@osric/types': TypeScript interfaces
'@osric/rules': Rule classes
'@osric/commands': Command classes
```

### **Proven Test Patterns**
```typescript
// Standard test setup
beforeEach(() => {
  context.setEntity('test-character', createMockCharacter());
  context.setTemporary('rule-params', { characterId: 'test-character' });
  mockCommand = { type: COMMAND_TYPES.ACTION_TYPE };
});

// Required test coverage
- canApply() validation
- execute() success scenarios  
- Error condition handling
- OSRIC compliance verification
```

### **Success Metrics**
- **Total Tests:** 324 passing ✅
- **Phase 5:** 76/76 passing (100% success rate)
- **Methodology:** Systematic testing approach established
- **Coverage:** All major OSRIC mechanics validated

---

## 🎮 **OSRIC COMPLIANCE REFERENCE**

### **Measurement Conversion**
- **Standard:** 1 inch = 3 meters
- **Application:** All movement, spell ranges, distances
- **Implementation:** Automatic conversion in rule logic

### **Core Mechanics**
- **Ability Scores:** 3-18 range with racial adjustments
- **THAC0:** Descending armor class system
- **Hit Points:** Class-based with Constitution modifiers
- **Saving Throws:** Five categories by class and level
- **Experience:** Class-specific XP tables and requirements

### **Advanced Systems**
- **Multi-class:** Human dual-class, demihuman multi-class
- **Spell Memorization:** Vancian magic system
- **Initiative:** Individual initiative with weapon speed
- **Morale:** 2d6 system with modifiers
- **Reaction:** 2d6 table with Charisma adjustments

---

## 🔧 **DEVELOPMENT QUICK START**

### **Adding New Features**
1. **Add Constants:** Update `osric/types/constants.ts`
2. **Create Rule:** Extend BaseRule in appropriate `rules/` subdirectory
3. **Create Command:** Extend BaseCommand in appropriate `commands/` subdirectory  
4. **Write Tests:** Follow established patterns in `__tests__/`
5. **Validate:** Ensure 100% test coverage and OSRIC compliance

### **Pattern Files to Copy**
- **Rule Template:** `osric/rules/experience/TrainingRules.ts`
- **Command Template:** `osric/commands/exploration/SearchCommand.ts`
- **Test Template:** `__tests__/rules/experience/TrainingRules.test.ts`

### **Required Imports**
```typescript
// Core infrastructure
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { BaseCommand, type CommandResult } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';

// Type constants
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';

// Testing
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
```

---

## 📚 **DOCUMENTATION REFERENCE**

### **Comprehensive Guides**
- **`ProjectPlan.md`** - Features, roadmap, progress tracking
- **`TestingMethodology.md`** - Testing procedures and breakthroughs
- **`ImplementationGuide.md`** - Feature development procedures
- **`ArchitectureGuide.md`** - Core architecture and design decisions
- **`ProjectReference.md`** - This file - quick reference and scope

### **OSRIC Documentation**
- **`docs/osric/`** - Original OSRIC rule excerpts and references
- **Index:** `docs/osric/00. Index.md`
- **Character Creation:** `docs/osric/01. Creating a Character.md`
- **Spells:** `docs/osric/02. Spells.md`

---

## 🎯 **SUCCESS CRITERIA**

### **Quantitative Targets**
- **Test Coverage:** 100% passing tests for all phases
- **OSRIC Compliance:** Complete AD&D 1st Edition mechanics
- **Architecture Consistency:** All components follow established patterns
- **Performance:** Efficient rule execution for real-time gameplay

### **Qualitative Goals**
- **Maintainability:** Clear patterns for adding new mechanics
- **Reliability:** Robust error handling and edge case coverage  
- **Usability:** Intuitive API for React game development
- **Completeness:** Comprehensive personal game development library

---

## 🚀 **NEXT ACTIONS**

### **Immediate Tasks**
1. **Implement Phase 6 NPC Systems** following established patterns
2. **Create comprehensive test suite** for NPC mechanics
3. **Validate OSRIC compliance** for reaction/morale/loyalty systems
4. **Maintain 100% test coverage** standard

### **Long-term Goals**
- Complete all remaining OSRIC systems (Phases 7-10)
- Achieve comprehensive AD&D 1st Edition rules coverage
- Maintain architecture stability and testing excellence
- Document any new patterns for future AI agent guidance

---

## 📞 **QUICK COMMAND REFERENCE**

### **Development Commands**
```bash
# Run all tests
pnpm test

# Run specific test file  
pnpm test TrainingRules.test.ts

# Build/check TypeScript
pnpm build

# Lint code
pnpm lint
```

### **File Navigation**
- **Active Code:** `osric/` directory
- **Tests:** `__tests__/` directory  
- **Documentation:** `docs/` directory
- **Configuration:** Root level (package.json, vitest.config.ts, etc.)

---

*Last Updated: Phase 5 completion with comprehensive testing methodology*
*Ready for Phase 6 NPC Systems implementation*
