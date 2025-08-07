# OSRIC "Generate Test" Tool

## Overview

The `tools/GenerateTest.ts` script automates the creation of comprehensive test files for the OSRIC Rules Engine. It reads the `TestTemplate.md`, analyzes the codebase for type definitions, and generates a skeleton test file with all required context setup, mocks, and error checks.

## Key Benefits

1. **Automatic Type Injection** - Reads your codebase and injects correct imports/types
2. **Complete Test Scaffolding** - All required context setup, mocks, error checks included
3. **OSRIC Compliance Built-in** - Authentic AD&D mechanics validation included
4. **Zero Deviation** - AI only fills in actual test logic, all patterns are pre-defined

## Usage

```bash
# Basic usage
node tools/GenerateTest.ts <ComponentName> <Category> <ComponentType>

# Examples
node tools/GenerateTest.ts AttackRoll rules Rule
node tools/GenerateTest.ts SearchCommand commands Command
node tools/GenerateTest.ts MoraleRules rules Rule
```

## Arguments

- **ComponentName** - Name of the component (e.g., AttackRoll, SearchCommand)
- **Category** - Category directory (rules, commands)  
- **ComponentType** - Type of component (Rule or Command)

## Type Analysis

The script automatically analyzes these files for type information:
- `osric/types/entities.ts` - Character, Monster, Spell, etc.
- `osric/types/constants.ts` - COMMAND_TYPES, RULE_NAMES, etc.
- `osric/types/commands.ts` - Command interfaces
- `osric/types/rules.ts` - Rule interfaces

## Output Structure

Generated test files follow this structure:

```
__tests__/
├── rules/
│   └── ComponentName.test.ts     # Rule tests
└── commands/
    └── ComponentName.test.ts     # Command tests
```

Each test file includes:
- Complete imports and setup
- Mock entity creation
- Context data preparation
- Comprehensive test scenarios
- OSRIC compliance validation
- Error condition handling

This approach ensures no AI model can ignore our testing standard - it's baked into the generated file structure.
