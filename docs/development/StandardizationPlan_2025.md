# OSRIC Rules Engine: Standardization Implementation Plan

**Plan Date:** August 8, 2025  
**Target:** Complete pattern standardization across all 330 TypeScript files  
**Approach:** Breaking changes allowed, no backward compatibility required

## 🎯 Executive Summary

This plan addresses the 11 major pattern inconsistencies identified in the code review, implementing strict standards with breaking changes to achieve maximum consistency and type safety.

## 📋 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. [Fix GameContext.getRuleEngine()](#1-gamecontext-getruleengine-implementation)
2. [Implement Central Temporary Data Registry](#2-central-temporary-data-registry)
3. [Unified Dice System](#3-unified-dice-system)
4. [Standardize Base Classes](#4-standardize-base-classes)

### Phase 2: Command Standardization (Week 2-3)
5. [Single Constructor Pattern](#5-single-constructor-pattern)
6. [Comprehensive Validation System](#6-comprehensive-validation-system)
7. [Command-Rule Contract Enforcement](#7-command-rule-contract-enforcement)

### Phase 3: Rule Implementation (Week 4-5)
8. [Implement Missing Rules](#8-implement-missing-rules)
9. [Single Data Access Pattern](#9-single-data-access-pattern)
10. [Spell System Cleanup](#10-spell-system-cleanup)

### Phase 4: Migration & Testing (Week 6)
11. [Temporary Data Key Migration](#11-temporary-data-key-migration)
12. [Comprehensive Testing](#12-comprehensive-testing)

---

## 🔧 Detailed Implementation Plans

### 1. GameContext.getRuleEngine() Implementation

**Current Problem:** Commands expect `context.getRuleEngine()` method that doesn't exist.

**Implementation:**

```typescript
// osric/core/GameContext.ts
export class GameContext {
  constructor(
    private store: ReturnType<typeof createStore>,
    private ruleEngine?: RuleEngine  // Add RuleEngine storage
  ) {}

  getRuleEngine(): RuleEngine {
    if (!this.ruleEngine) {
      throw new OSRICError.builder()
        .setType('system')
        .setMessage('RuleEngine not initialized in GameContext')
        .addSuggestion('Initialize GameContext with RuleEngine instance')
        .build();
    }
    return this.ruleEngine;
  }

  setRuleEngine(engine: RuleEngine): void {
    this.ruleEngine = engine;
  }

  // Validation method for startup checks
  isFullyInitialized(): boolean {
    return this.ruleEngine !== undefined;
  }
}
```

**Files to Update:**
- `osric/core/GameContext.ts`
- All test files that create GameContext instances
- Integration test setup files

### 2. Central Temporary Data Registry

**Current Problem:** 8 different naming patterns cause conflicts and confusion.

**Implementation:**

```typescript
// osric/core/TemporaryDataRegistry.ts
export const TEMP_DATA_KEYS = {
  spell: {
    CAST_PARAMS: 'spell:cast-spell:params',
    CAST_CONTEXT: 'spell:cast-spell:context',
    CAST_CASTER: 'spell:cast-spell:caster',
    CAST_SPELL: 'spell:cast-spell:spell-data',
    CAST_TARGETS: 'spell:cast-spell:targets',
    CAST_COMPONENTS: 'spell:cast-spell:components',
    CAST_VALIDATION: 'spell:cast-spell:validation',
    
    MEMORIZE_PARAMS: 'spell:memorize-spell:params',
    MEMORIZE_CONTEXT: 'spell:memorize-spell:context',
    MEMORIZE_CASTER: 'spell:memorize-spell:caster',
    MEMORIZE_SPELL: 'spell:memorize-spell:spell-data',
    
    SCROLL_PARAMS: 'spell:scroll-read:params',
    SCROLL_CONTEXT: 'spell:scroll-read:context',
    SCROLL_READER: 'spell:scroll-read:reader',
    SCROLL_ITEM: 'spell:scroll-read:scroll-item',
    
    IDENTIFY_PARAMS: 'spell:identify-magic-item:params',
    IDENTIFY_CONTEXT: 'spell:identify-magic-item:context',
    IDENTIFY_ITEM: 'spell:identify-magic-item:target-item',
    
    COMPONENT_TRACKING: 'spell:component-tracking:state',
    SLOT_MANAGEMENT: 'spell:slot-management:state',
  },
  
  combat: {
    ATTACK_PARAMS: 'combat:attack:params',
    ATTACK_CONTEXT: 'combat:attack:context',
    ATTACK_ATTACKER: 'combat:attack:attacker',
    ATTACK_TARGET: 'combat:attack:target',
    ATTACK_WEAPON: 'combat:attack:weapon',
    ATTACK_ROLL_RESULT: 'combat:attack:roll-result',
    
    INITIATIVE_PARAMS: 'combat:initiative:params',
    INITIATIVE_CONTEXT: 'combat:initiative:context',
    INITIATIVE_PARTICIPANTS: 'combat:initiative:participants',
    INITIATIVE_ORDER: 'combat:initiative:order',
    
    GRAPPLE_PARAMS: 'combat:grapple:params',
    GRAPPLE_CONTEXT: 'combat:grapple:context',
    GRAPPLE_ATTACKER: 'combat:grapple:attacker',
    GRAPPLE_DEFENDER: 'combat:grapple:defender',
  },
  
  character: {
    CREATE_PARAMS: 'character:create-character:params',
    CREATE_CONTEXT: 'character:create-character:context',
    CREATE_ABILITY_SCORES: 'character:create-character:ability-scores',
    CREATE_ADJUSTED_SCORES: 'character:create-character:adjusted-scores',
    CREATE_CHARACTER_DATA: 'character:create-character:character-data',
    
    LEVEL_UP_PARAMS: 'character:level-up:params',
    LEVEL_UP_CONTEXT: 'character:level-up:context',
    LEVEL_UP_CHARACTER: 'character:level-up:character',
    LEVEL_UP_BENEFITS: 'character:level-up:benefits',
    
    GAIN_EXP_PARAMS: 'character:gain-experience:params',
    GAIN_EXP_CONTEXT: 'character:gain-experience:context',
    GAIN_EXP_CHARACTER: 'character:gain-experience:character',
    GAIN_EXP_PARTY: 'character:gain-experience:party-data',
    
    SAVING_THROW_PARAMS: 'character:saving-throw:params',
    SAVING_THROW_CONTEXT: 'character:saving-throw:context',
    SAVING_THROW_CHARACTER: 'character:saving-throw:character',
    
    THIEF_SKILL_PARAMS: 'character:thief-skill-check:params',
    THIEF_SKILL_CONTEXT: 'character:thief-skill-check:context',
    THIEF_SKILL_CHARACTER: 'character:thief-skill-check:character',
    
    TURN_UNDEAD_PARAMS: 'character:turn-undead:params',
    TURN_UNDEAD_CONTEXT: 'character:turn-undead:context',
    TURN_UNDEAD_CLERIC: 'character:turn-undead:cleric',
    TURN_UNDEAD_TARGETS: 'character:turn-undead:undead-targets',
  },
  
  exploration: {
    SEARCH_PARAMS: 'exploration:search:params',
    SEARCH_CONTEXT: 'exploration:search:context',
    SEARCH_CHARACTER: 'exploration:search:character',
    SEARCH_AREA: 'exploration:search:area',
    
    MOVE_PARAMS: 'exploration:move:params',
    MOVE_CONTEXT: 'exploration:move:context',
    MOVE_CHARACTER: 'exploration:move:character',
    MOVE_DESTINATION: 'exploration:move:destination',
    
    FALLING_DAMAGE_PARAMS: 'exploration:falling-damage:params',
    FALLING_DAMAGE_CONTEXT: 'exploration:falling-damage:context',
    FALLING_DAMAGE_CHARACTER: 'exploration:falling-damage:character',
    
    FORAGING_PARAMS: 'exploration:foraging:params',
    FORAGING_CONTEXT: 'exploration:foraging:context',
    FORAGING_CHARACTER: 'exploration:foraging:character',
    
    TERRAIN_NAV_PARAMS: 'exploration:terrain-navigation:params',
    TERRAIN_NAV_CONTEXT: 'exploration:terrain-navigation:context',
    TERRAIN_NAV_CHARACTER: 'exploration:terrain-navigation:character',
    
    WEATHER_CHECK_PARAMS: 'exploration:weather-check:params',
    WEATHER_CHECK_CONTEXT: 'exploration:weather-check:context',
    WEATHER_CHECK_CHARACTER: 'exploration:weather-check:character',
    WEATHER_CHECK_CONDITIONS: 'exploration:weather-check:conditions',
  },
  
  npc: {
    MONSTER_GEN_PARAMS: 'npc:monster-generation:params',
    MONSTER_GEN_CONTEXT: 'npc:monster-generation:context',
    MONSTER_GEN_RESULT: 'npc:monster-generation:generated-monster',
    
    REACTION_ROLL_PARAMS: 'npc:reaction-roll:params',
    REACTION_ROLL_CONTEXT: 'npc:reaction-roll:context',
    REACTION_ROLL_NPC: 'npc:reaction-roll:npc',
    REACTION_ROLL_PARTY: 'npc:reaction-roll:party',
  },
} as const;

// Type-safe key extraction
export type TempDataKey = typeof TEMP_DATA_KEYS[keyof typeof TEMP_DATA_KEYS][keyof typeof TEMP_DATA_KEYS[keyof typeof TEMP_DATA_KEYS]];

// Validation function for startup checks
export function validateTempDataKeyUniqueness(): { valid: boolean; duplicates: string[] } {
  const allKeys: string[] = [];
  
  Object.values(TEMP_DATA_KEYS).forEach(domain => {
    Object.values(domain).forEach(key => {
      allKeys.push(key);
    });
  });
  
  const duplicates = allKeys.filter((key, index) => allKeys.indexOf(key) !== index);
  
  return {
    valid: duplicates.length === 0,
    duplicates: [...new Set(duplicates)]
  };
}
```

### 3. Unified Dice System

**Current Problem:** 5+ different dice implementations without unified approach.

**Implementation:**

```typescript
// osric/core/DiceEngine.ts
export interface DiceRoll {
  readonly notation: string;      // "1d20+5"
  readonly rolls: number[];       // Individual die results [15]
  readonly modifier: number;      // Flat modifier: 5
  readonly total: number;         // Final result: 20
  readonly breakdown: string;     // "15 + 5 = 20"
}

export interface MockDiceConfig {
  enabled: boolean;
  forcedResults?: number[];
  resultIndex?: number;
}

export class DiceEngine {
  private static mockConfig: MockDiceConfig = { enabled: false };
  
  static configureMocking(config: MockDiceConfig): void {
    this.mockConfig = { ...config, resultIndex: 0 };
  }
  
  static roll(notation: string): DiceRoll {
    const parsed = this.parseNotation(notation);
    const rolls: number[] = [];
    
    for (let i = 0; i < parsed.count; i++) {
      if (this.mockConfig.enabled && this.mockConfig.forcedResults) {
        const index = (this.mockConfig.resultIndex || 0) % this.mockConfig.forcedResults.length;
        rolls.push(this.mockConfig.forcedResults[index]);
        this.mockConfig.resultIndex = (this.mockConfig.resultIndex || 0) + 1;
      } else {
        rolls.push(Math.floor(Math.random() * parsed.sides) + 1);
      }
    }
    
    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + parsed.modifier;
    
    return {
      notation,
      rolls,
      modifier: parsed.modifier,
      total,
      breakdown: this.createBreakdown(rolls, parsed.modifier, total)
    };
  }
  
  static rollMultiple(notation: string, count: number): DiceRoll[] {
    const results: DiceRoll[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.roll(notation));
    }
    return results;
  }
  
  static rollWithAdvantage(notation: string): DiceRoll {
    const roll1 = this.roll(notation);
    const roll2 = this.roll(notation);
    return roll1.total >= roll2.total ? roll1 : roll2;
  }
  
  static rollWithDisadvantage(notation: string): DiceRoll {
    const roll1 = this.roll(notation);
    const roll2 = this.roll(notation);
    return roll1.total <= roll2.total ? roll1 : roll2;
  }
  
  private static parseNotation(notation: string): { count: number; sides: number; modifier: number } {
    const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }
    
    return {
      count: parseInt(match[1] || '1', 10),
      sides: parseInt(match[2], 10),
      modifier: parseInt(match[3] || '0', 10)
    };
  }
  
  private static createBreakdown(rolls: number[], modifier: number, total: number): string {
    if (rolls.length === 1 && modifier === 0) {
      return total.toString();
    }
    
    const rollsStr = rolls.length === 1 ? rolls[0].toString() : `[${rolls.join(', ')}]`;
    
    if (modifier === 0) {
      return `${rollsStr} = ${total}`;
    }
    
    const modifierStr = modifier > 0 ? `+${modifier}` : modifier.toString();
    return `${rollsStr} ${modifierStr} = ${total}`;
  }
}

// Remove old Dice.ts interfaces completely - no backward compatibility
```

### 4. Standardize Base Classes

**Current Problem:** Inconsistent base class implementations.

**Implementation:**

```typescript
// osric/core/Command.ts - Updated
export interface CommandResult<TData = Record<string, unknown>> {
  success: boolean;
  message: string;
  data?: TData;
  effects?: string[];
  damage?: number[];
  error?: OSRICError;
  executionTime?: number;
  commandType?: string;
}

export interface Command<TParams = unknown> {
  readonly type: string;
  readonly parameters: TParams;
  readonly actorId: string;
  readonly targetIds: string[];

  execute(context: GameContext): Promise<CommandResult>;
  canExecute(context: GameContext): boolean;
  getRequiredRules(): string[];
  getInvolvedEntities(): string[];
}

export abstract class BaseCommand<TParams = unknown> implements Command<TParams> {
  abstract readonly type: string;

  constructor(
    public readonly parameters: TParams,
    public readonly actorId: string,
    public readonly targetIds: string[] = []
  ) {
    this.validateParameters();
  }

  abstract execute(context: GameContext): Promise<CommandResult>;
  abstract canExecute(context: GameContext): boolean;
  abstract getRequiredRules(): string[];
  
  // Strict parameter validation - no exceptions
  protected abstract validateParameters(): void;

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }

  protected validateEntitiesExist(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => context.hasEntity(id));
  }

  protected validateEntitiesConscious(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => {
      const entity = context.getEntity(id);
      return entity && entity.hitPoints > 0;
    });
  }

  protected createSuccessResult<T>(
    message: string,
    data?: T,
    effects?: string[],
    damage?: number[]
  ): CommandResult<T> {
    return { 
      success: true, 
      message, 
      data, 
      effects, 
      damage,
      commandType: this.type
    };
  }

  protected createFailureResult<T>(
    message: string, 
    data?: T,
    error?: OSRICError
  ): CommandResult<T> {
    return { 
      success: false, 
      message, 
      data,
      error,
      commandType: this.type
    };
  }
}
```

```typescript
// osric/core/Rule.ts - Updated
export abstract class BaseRule<TContext = unknown> implements Rule {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract apply(command: Command, context: GameContext): Promise<RuleResult>;
  abstract canApply(command: Command, context: GameContext): boolean;
  
  // Strict data access pattern - type-safe with validation
  protected getRequiredContext<T>(context: GameContext, key: TempDataKey): T {
    const data = context.getTemporary<T>(key);
    if (data === null || data === undefined) {
      throw new OSRICError.builder()
        .setType('system')
        .setMessage(`Required context missing: ${key}`)
        .addContext('rule', this.name)
        .addSuggestion('Ensure previous rules set the required context')
        .build();
    }
    return data;
  }
  
  protected getOptionalContext<T>(context: GameContext, key: TempDataKey): T | null {
    return context.getTemporary<T>(key) || null;
  }
  
  protected setContext<T>(context: GameContext, key: TempDataKey, value: T): void {
    context.setTemporary(key, value);
  }
  
  // Validation for startup checks
  abstract getPrerequisites(): string[];
  
  validate(availableRules: string[]): { valid: boolean; missing: string[] } {
    const prerequisites = this.getPrerequisites();
    const missing = prerequisites.filter(req => !availableRules.includes(req));
    return { valid: missing.length === 0, missing };
  }
}
```

### 5. Single Constructor Pattern

**Current Problem:** 5 different constructor patterns across commands.

**Implementation Strategy:**

All commands will follow this pattern:
```typescript
// Standard pattern for all commands
constructor(
  parameters: TSpecificParams,
  actorId: string,
  targetIds: string[] = []
) {
  super(parameters, actorId, targetIds);
}
```

**Migration Plan:**

1. **Character Commands:**
```typescript
// BEFORE: CreateCharacterCommand
constructor(private parameters: CreateCharacterParameters, actorId = 'game-master') {
  super(actorId);
}

// AFTER: CreateCharacterCommand  
constructor(
  parameters: CreateCharacterParameters,
  actorId: string,
  targetIds: string[] = []
) {
  super(parameters, actorId, targetIds);
}
```

2. **Spell Commands:**
```typescript
// BEFORE: CastSpellCommand
constructor(casterId: string, private spellName: string, targetIds: string[] = []) {
  super(casterId, targetIds);
}

// AFTER: CastSpellCommand
interface CastSpellParameters {
  spellName: string;
  spellLevel?: number;
  components?: SpellComponent[];
  overrideRequirements?: boolean;
}

constructor(
  parameters: CastSpellParameters,
  actorId: string,
  targetIds: string[] = []
) {
  super(parameters, actorId, targetIds);
}
```

3. **Combat Commands:**
```typescript
// BEFORE: AttackCommand  
constructor(private parameters: AttackParameters, actorId: string) {
  super(actorId);
}

// AFTER: AttackCommand
constructor(
  parameters: AttackParameters,
  actorId: string,
  targetIds: string[] = []
) {
  super(parameters, actorId, targetIds);
}
```

**Files to Update (Complete List):**
- `osric/commands/character/CreateCharacterCommand.ts`
- `osric/commands/character/GainExperienceCommand.ts`
- `osric/commands/character/LevelUpCommand.ts`
- `osric/commands/character/SavingThrowCommand.ts`
- `osric/commands/character/ThiefSkillCheckCommand.ts`
- `osric/commands/character/TurnUndeadCommand.ts`
- `osric/commands/combat/AttackCommand.ts`
- `osric/commands/combat/GrappleCommand.ts`
- `osric/commands/combat/InitiativeCommand.ts`
- `osric/commands/exploration/FallingDamageCommand.ts`
- `osric/commands/exploration/ForagingCommand.ts`
- `osric/commands/exploration/MoveCommand.ts`
- `osric/commands/exploration/SearchCommand.ts`
- `osric/commands/exploration/TerrainNavigationCommand.ts`
- `osric/commands/exploration/WeatherCheckCommand.ts`
- `osric/commands/npc/MonsterGenerationCommand.ts`
- `osric/commands/npc/ReactionRollCommand.ts`
- `osric/commands/spells/CastSpellCommand.ts`
- `osric/commands/spells/MemorizeSpellCommand.ts`
- `osric/commands/spells/ScrollReadCommand.ts`
- `osric/commands/spells/IdentifyMagicItemCommand.ts`

### 6. Comprehensive Validation System

**Current Problem:** 4 validation tiers from comprehensive to none.

**Implementation - Declarative Validation:**

```typescript
// osric/core/ValidationEngine.ts
export interface ValidationRule<T = any> {
  validate(value: T): boolean;
  message: string;
  field?: string;
}

export class ValidationEngine {
  static required<T>(field: string): ValidationRule<T> {
    return {
      validate: (value: T) => value !== null && value !== undefined && value !== '',
      message: `${field} is required`,
      field
    };
  }
  
  static stringLength(field: string, min: number, max: number): ValidationRule<string> {
    return {
      validate: (value: string) => value && value.length >= min && value.length <= max,
      message: `${field} must be between ${min} and ${max} characters`,
      field
    };
  }
  
  static numberRange(field: string, min: number, max: number): ValidationRule<number> {
    return {
      validate: (value: number) => value >= min && value <= max,
      message: `${field} must be between ${min} and ${max}`,
      field
    };
  }
  
  static oneOf<T>(field: string, allowedValues: T[]): ValidationRule<T> {
    return {
      validate: (value: T) => allowedValues.includes(value),
      message: `${field} must be one of: ${allowedValues.join(', ')}`,
      field
    };
  }
  
  static entityExists(field: string, context: GameContext): ValidationRule<string> {
    return {
      validate: (value: string) => context.hasEntity(value),
      message: `${field} entity does not exist`,
      field
    };
  }
  
  static arrayNotEmpty<T>(field: string): ValidationRule<T[]> {
    return {
      validate: (value: T[]) => Array.isArray(value) && value.length > 0,
      message: `${field} must contain at least one item`,
      field
    };
  }
}

// Updated BaseCommand with declarative validation
export abstract class BaseCommand<TParams = unknown> implements Command<TParams> {
  constructor(
    public readonly parameters: TParams,
    public readonly actorId: string, 
    public readonly targetIds: string[] = []
  ) {
    this.validateParameters();
  }

  protected validateParameters(): void {
    const rules = this.getValidationRules();
    const errors: string[] = [];
    
    for (const rule of rules) {
      const value = this.getFieldValue(rule.field || '');
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }
    
    if (errors.length > 0) {
      throw new OSRICError.builder()
        .setType('validation')
        .setMessage(`Parameter validation failed for ${this.type}`)
        .addContext('errors', errors)
        .addContext('parameters', this.parameters)
        .build();
    }
  }
  
  protected abstract getValidationRules(): ValidationRule[];
  
  private getFieldValue(field: string): any {
    if (!field) return this.parameters;
    
    const parts = field.split('.');
    let value: any = this.parameters;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }
}
```

**Example Implementation:**
```typescript
// osric/commands/character/CreateCharacterCommand.ts
export class CreateCharacterCommand extends BaseCommand<CreateCharacterParameters> {
  readonly type = 'create-character' as const;

  protected getValidationRules(): ValidationRule[] {
    return [
      ValidationEngine.required<string>('name'),
      ValidationEngine.stringLength('name', 1, 50),
      ValidationEngine.oneOf('race', ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'half-elf', 'half-orc']),
      ValidationEngine.oneOf('class', ['fighter', 'cleric', 'magic-user', 'thief', 'ranger', 'paladin']),
      ValidationEngine.oneOf('alignment', ['lawful-good', 'neutral-good', 'chaotic-good', 'lawful-neutral', 'true-neutral', 'chaotic-neutral', 'lawful-evil', 'neutral-evil', 'chaotic-evil']),
      ValidationEngine.numberRange('abilityScores.strength', 3, 18),
      ValidationEngine.numberRange('abilityScores.intelligence', 3, 18),
      ValidationEngine.numberRange('abilityScores.wisdom', 3, 18),
      ValidationEngine.numberRange('abilityScores.dexterity', 3, 18),
      ValidationEngine.numberRange('abilityScores.constitution', 3, 18),
      ValidationEngine.numberRange('abilityScores.charisma', 3, 18),
    ];
  }
  
  // ... rest of implementation
}
```

### 7. Command-Rule Contract Enforcement

**Current Problem:** Commands reference 15+ rules that don't exist, using 4 different naming conventions.

**Implementation:**

```typescript
// osric/types/rules.ts - Updated with exact matching
export const RULE_NAMES = {
  // Character rules (exactly match command requirements)
  ABILITY_SCORE_GENERATION: 'ability-score-generation',
  CHARACTER_CREATION_VALIDATION: 'character-creation-validation', 
  LEVEL_PROGRESSION: 'level-progression',
  SAVING_THROW: 'saving-throw',
  THIEF_SKILL_CHECK: 'thief-skill-check',
  TURN_UNDEAD: 'turn-undead',
  EXPERIENCE_GAIN: 'experience-gain',
  
  // Combat rules (exactly match command requirements)
  ATTACK_ROLL: 'attack-roll',
  DAMAGE_CALCULATION: 'damage-calculation',
  INITIATIVE_ROLL: 'initiative-roll',
  INITIATIVE_ORDER: 'initiative-order',
  SURPRISE_CHECK: 'surprise-check',
  GRAPPLE_CHECK: 'grapple-check',
  
  // Spell rules (exactly match command requirements)
  SPELL_CASTING_VALIDATION: 'spell-casting-validation',
  COMPONENT_TRACKING: 'component-tracking',
  SPELL_SLOT_CONSUMPTION: 'spell-slot-consumption',
  SCROLL_VALIDATION: 'scroll-validation',
  SCROLL_READING_CHANCE: 'scroll-reading-chance',
  SCROLL_SPELL_CASTING: 'scroll-spell-casting',
  SPELL_MEMORIZATION_VALIDATION: 'spell-memorization-validation',
  SPELL_SLOT_ALLOCATION: 'spell-slot-allocation',
  IDENTIFICATION_VALIDATION: 'identification-validation',
  IDENTIFICATION_METHOD: 'identification-method',
  IDENTIFICATION_RESULTS: 'identification-results',
  
  // Exploration rules (exactly match command requirements)
  SEARCH_CHECK: 'search-check',
  MOVEMENT_VALIDATION: 'movement-validation',
  FALLING_DAMAGE_CALCULATION: 'falling-damage-calculation',
  FORAGING_CHECK: 'foraging-check',
  TERRAIN_NAVIGATION: 'terrain-navigation',
  WEATHER_CHECK: 'weather-check',
  
  // NPC rules (exactly match command requirements)
  MONSTER_BEHAVIOR: 'monster-behavior',
  SPECIAL_ABILITIES: 'special-abilities',
  TREASURE_GENERATION: 'treasure-generation',
  REACTION_ROLL: 'reaction-roll',
} as const;

// Startup validation system
export class RuleContractValidator {
  static validateAllContracts(ruleEngine: RuleEngine): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const registeredRules = Object.keys(ruleEngine.getRegisteredChains());
    
    // Check all command types
    const commandTypes = Object.values(COMMAND_TYPES);
    
    for (const commandType of commandTypes) {
      const command = this.createMockCommand(commandType);
      const requiredRules = command.getRequiredRules();
      
      for (const ruleName of requiredRules) {
        if (!registeredRules.includes(ruleName)) {
          issues.push(`Command ${commandType} requires rule '${ruleName}' which is not registered`);
        }
        
        if (!Object.values(RULE_NAMES).includes(ruleName as any)) {
          issues.push(`Command ${commandType} references rule '${ruleName}' which is not in RULE_NAMES constant`);
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  private static createMockCommand(commandType: string): Command {
    // Factory method to create minimal command instances for validation
    // Implementation depends on specific command constructors
  }
}
```

### 8. Implement Missing Rules

**Current Problem:** 15+ rules referenced by commands don't exist.

**Implementation Priority:**

**High Priority - Critical for functionality:**
1. `initiative-order` - Required by InitiativeCommand
2. `surprise-check` - Required by InitiativeCommand  
3. `monster-behavior` - Required by MonsterGenerationCommand
4. `special-abilities` - Required by MonsterGenerationCommand
5. `treasure-generation` - Required by MonsterGenerationCommand

**Medium Priority - Spell system:**
6. `scroll-validation` - Required by ScrollReadCommand
7. `scroll-reading-chance` - Required by ScrollReadCommand
8. `scroll-spell-casting` - Required by ScrollReadCommand
9. `spell-memorization-validation` - Required by MemorizeSpellCommand
10. `spell-slot-allocation` - Required by MemorizeSpellCommand
11. `identification-validation` - Required by IdentifyMagicItemCommand
12. `identification-method` - Required by IdentifyMagicItemCommand
13. `identification-results` - Required by IdentifyMagicItemCommand

**Example Implementation:**

```typescript
// osric/rules/combat/InitiativeOrderRules.ts
export class InitiativeOrderRules extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ORDER;
  readonly priority = RulePriorities.RESULT_CALCULATION;

  async apply(command: Command, context: GameContext): Promise<RuleResult> {
    const participants = this.getRequiredContext<InitiativeParticipant[]>(
      context, 
      TEMP_DATA_KEYS.combat.INITIATIVE_PARTICIPANTS
    );
    
    // Sort by initiative roll + dexterity modifier
    const orderedParticipants = participants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative; // Higher initiative goes first
      }
      return b.dexterityModifier - a.dexterityModifier; // Higher dex breaks ties
    });
    
    this.setContext(context, TEMP_DATA_KEYS.combat.INITIATIVE_ORDER, orderedParticipants);
    
    return {
      success: true,
      message: `Initiative order determined for ${orderedParticipants.length} participants`,
      data: { order: orderedParticipants.map(p => p.entityId) }
    };
  }

  canApply(command: Command, context: GameContext): boolean {
    return command.type === 'initiative' && 
           this.getOptionalContext(context, TEMP_DATA_KEYS.combat.INITIATIVE_PARTICIPANTS) !== null;
  }

  getPrerequisites(): string[] {
    return [RULE_NAMES.INITIATIVE_ROLL];
  }
}
```

### 9. Single Data Access Pattern

**Current Problem:** Rules access temporary data using 8 different patterns.

**Implementation:** Already defined in BaseRule above, enforced through:

```typescript
// All rules must use these methods:
protected getRequiredContext<T>(context: GameContext, key: TempDataKey): T
protected getOptionalContext<T>(context: GameContext, key: TempDataKey): T | null  
protected setContext<T>(context: GameContext, key: TempDataKey, value: T): void
```

**Migration Example:**

```typescript
// BEFORE: SpellCastingRules.ts
const caster = context.getTemporary<Character>('castSpell_caster');
const spell = context.getTemporary<Spell>('castSpell_spell');

// AFTER: SpellCastingRules.ts  
const caster = this.getRequiredContext<Character>(context, TEMP_DATA_KEYS.spell.CAST_CASTER);
const spell = this.getRequiredContext<Spell>(context, TEMP_DATA_KEYS.spell.CAST_SPELL);
```

### 10. Spell System Cleanup

**Current Problem:** Most inconsistent area with 3 constructor patterns, 4 data access patterns.

**Standardization Plan:**

**Parameter Interfaces:**
```typescript
// osric/types/commands.ts - Spell command parameters
export interface CastSpellParameters {
  spellName: string;
  spellLevel?: number;
  targetIds?: string[];
  components?: SpellComponent[];
  overrideRequirements?: boolean;
}

export interface MemorizeSpellParameters {
  spellName: string;
  spellLevel: number;
  replaceSpell?: string;
  spellSlot?: number;
}

export interface ScrollReadParameters {
  scrollId: string;
  targetIds?: string[];
  overrideRequirements?: boolean;
}

export interface IdentifyMagicItemParameters {
  itemId: string;
  method: 'spell' | 'sage' | 'trial';
  spellName?: string; // Required if method is 'spell'
}
```

**Context Interfaces:**
```typescript
// osric/types/spell-contexts.ts
export interface SpellCastingContext {
  caster: Character;
  spell: Spell;
  targets: Character[];
  components: SpellComponent[];
  slot: SpellSlot;
  validationResults: SpellValidation;
  overrideRequirements: boolean;
}

export interface SpellMemorizationContext {
  caster: Character;
  spell: Spell;
  targetSlot: SpellSlot;
  replacedSpell?: Spell;
  validationResults: SpellValidation;
}

export interface ScrollReadingContext {
  reader: Character;
  scroll: MagicScroll;
  spell: Spell;
  targets: Character[];
  readingChance: number;
  validationResults: ScrollValidation;
}

export interface MagicItemIdentificationContext {
  identifier: Character;
  item: MagicItem;
  method: IdentificationMethod;
  identificationSpell?: Spell;
  successChance: number;
  identificationResults: IdentificationResult;
}
```

**Standardized Commands:**
```typescript
// osric/commands/spells/CastSpellCommand.ts - Standardized
export class CastSpellCommand extends BaseCommand<CastSpellParameters> {
  readonly type = 'cast-spell' as const;

  constructor(
    parameters: CastSpellParameters,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);
  }

  protected getValidationRules(): ValidationRule[] {
    return [
      ValidationEngine.required<string>('spellName'),
      ValidationEngine.stringLength('spellName', 1, 100),
      ValidationEngine.numberRange('spellLevel', 1, 9),
    ];
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.SPELL_CASTING_VALIDATION,
      RULE_NAMES.COMPONENT_TRACKING,
      RULE_NAMES.SPELL_SLOT_CONSUMPTION,
    ];
  }

  // ... implementation using TEMP_DATA_KEYS.spell.*
}
```

### 11. Temporary Data Key Migration

**Current Problem:** 8 different naming patterns need consolidation.

**Migration Strategy:**

1. **Automated Migration Script:**
```typescript
// scripts/migrate-temp-keys.ts
const MIGRATION_MAP = {
  // Old pattern -> New pattern
  'search-request-params': TEMP_DATA_KEYS.exploration.SEARCH_PARAMS,
  'castSpell_caster': TEMP_DATA_KEYS.spell.CAST_CASTER,
  'castSpell_spell': TEMP_DATA_KEYS.spell.CAST_SPELL,
  'scrollCreation_characterId': TEMP_DATA_KEYS.spell.SCROLL_CONTEXT,
  'monster-generation-params': TEMP_DATA_KEYS.npc.MONSTER_GEN_PARAMS,
  'character-creation': TEMP_DATA_KEYS.character.CREATE_PARAMS,
  // ... complete mapping
};

function migrateFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
    content = content.replace(
      new RegExp(`['"]${oldKey}['"]`, 'g'),
      `TEMP_DATA_KEYS.${newKey}`
    );
  }
  
  fs.writeFileSync(filePath, content);
}
```

2. **Manual Verification:** Check each migrated file for context correctness.

### 12. Comprehensive Testing

**Test Update Strategy:**

1. **Update test mocks to use new patterns:**
```typescript
// __tests__/helpers/MockGameContext.ts
export function createMockGameContextWithRuleEngine(): GameContext {
  const store = createStore();
  const context = new GameContext(store);
  const ruleEngine = new RuleEngine();
  
  // Register all required rule chains
  setupAllRuleChains(ruleEngine);
  context.setRuleEngine(ruleEngine);
  
  return context;
}
```

2. **Add contract validation tests:**
```typescript
// __tests__/validation/RuleContractValidation.test.ts
describe('Rule Contract Validation', () => {
  it('should validate all commands have their required rules registered', () => {
    const ruleEngine = setupProductionRuleEngine();
    const validation = RuleContractValidator.validateAllContracts(ruleEngine);
    
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });
});
```

3. **Dice system testing:**
```typescript
// __tests__/core/DiceEngine.test.ts
describe('DiceEngine', () => {
  beforeEach(() => {
    DiceEngine.configureMocking({ enabled: true, forcedResults: [10, 15, 8] });
  });
  
  it('should use mocked results in tests', () => {
    const result = DiceEngine.roll('1d20+5');
    expect(result.total).toBe(15); // 10 + 5
  });
});
```

---

## 📅 Implementation Timeline

### Week 1: Core Infrastructure
- [ ] Day 1-2: GameContext.getRuleEngine() + Central Registry
- [ ] Day 3-4: Unified Dice System + Base Class Updates  
- [ ] Day 5: Integration testing

### Week 2: Command Standardization
- [ ] Day 1-2: Character + Combat commands
- [ ] Day 3-4: Exploration + NPC commands
- [ ] Day 5: Spell commands (most complex)

### Week 3: Validation & Contracts
- [ ] Day 1-2: Comprehensive validation system
- [ ] Day 3-4: Rule contract enforcement
- [ ] Day 5: Missing rule identification

### Week 4: Rule Implementation
- [ ] Day 1-2: High priority rules (initiative, monster)
- [ ] Day 3-4: Medium priority rules (spells)
- [ ] Day 5: Rule integration testing

### Week 5: Data Access & Spell Cleanup
- [ ] Day 1-2: Single data access pattern migration
- [ ] Day 3-5: Spell system complete overhaul

### Week 6: Migration & Testing
- [ ] Day 1-2: Temporary data key migration
- [ ] Day 3-5: Comprehensive testing + bug fixes

---

## 🎯 Success Criteria

1. **Zero Pattern Inconsistencies:** All commands use identical constructor patterns
2. **Complete Type Safety:** No `any` types or unsafe casts in command/rule interactions
3. **Full Contract Compliance:** All required rules exist and are properly named
4. **Unified Systems:** Single dice implementation, single data access pattern
5. **Comprehensive Validation:** All commands have complete upfront validation
6. **Zero Missing Dependencies:** All rule prerequisites satisfied
7. **Clean Spell System:** Spell commands/rules follow identical patterns to other systems
8. **Startup Validation:** System validates all contracts and dependencies on initialization

## 🔄 Risk Mitigation

1. **Incremental Implementation:** Each phase builds on previous phases
2. **Extensive Testing:** All changes covered by existing and new tests  
3. **Clear Rollback Points:** Each week represents a stable milestone
4. **Documentation Updates:** All changes documented as implemented
5. **Backward Compatibility Breaks:** Acceptable and planned for clean architecture

This plan will transform your OSRIC rules engine from having 11 major pattern inconsistencies to a fully standardized, type-safe, and maintainable codebase while preserving all the excellent OSRIC compliance and architectural decisions you've already made.
