#!/usr/bin/env node

/**
 * Script 03: Create Unified Dice Engine
 *
 * This script creates the new DiceEngine to replace the 5+ different
 * dice implementations currently scattered across the codebase.
 */

const fs = require('node:fs');
const path = require('node:path');

const DICE_ENGINE_PATH = path.join(__dirname, '..', 'osric', 'core', 'DiceEngine.ts');
const OLD_DICE_PATH = path.join(__dirname, '..', 'osric', 'core', 'Dice.ts');

function createDiceEngine() {
  console.log('🎲 Creating unified DiceEngine...');

  const diceEngineContent = `/**
 * Unified Dice Engine for OSRIC Rules Engine
 * 
 * Replaces multiple scattered dice implementations with a single,
 * consistent, testable dice rolling system.
 */

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
  
  /**
   * Configure dice mocking for testing
   */
  static configureMocking(config: MockDiceConfig): void {
    this.mockConfig = { ...config, resultIndex: 0 };
  }
  
  /**
   * Roll dice using standard notation (e.g., "1d20+5", "3d6", "2d8-1")
   */
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
  
  /**
   * Roll the same dice multiple times
   */
  static rollMultiple(notation: string, count: number): DiceRoll[] {
    const results: DiceRoll[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.roll(notation));
    }
    return results;
  }
  
  /**
   * Roll with advantage (take higher of two rolls)
   */
  static rollWithAdvantage(notation: string): DiceRoll {
    const roll1 = this.roll(notation);
    const roll2 = this.roll(notation);
    return roll1.total >= roll2.total ? roll1 : roll2;
  }
  
  /**
   * Roll with disadvantage (take lower of two rolls)
   */
  static rollWithDisadvantage(notation: string): DiceRoll {
    const roll1 = this.roll(notation);
    const roll2 = this.roll(notation);
    return roll1.total <= roll2.total ? roll1 : roll2;
  }
  
  /**
   * Roll and return only the total (for compatibility)
   */
  static rollTotal(notation: string): number {
    return this.roll(notation).total;
  }
  
  /**
   * Parse dice notation into components
   */
  private static parseNotation(notation: string): { count: number; sides: number; modifier: number } {
    const match = notation.match(/^(\\d+)?d(\\d+)([+-]\\d+)?$/i);
    if (!match) {
      throw new Error(\`Invalid dice notation: \${notation}. Expected format: [count]d[sides][+/-modifier]\`);
    }
    
    return {
      count: parseInt(match[1] || '1', 10),
      sides: parseInt(match[2], 10),
      modifier: parseInt(match[3] || '0', 10)
    };
  }
  
  /**
   * Create human-readable breakdown of the roll
   */
  private static createBreakdown(rolls: number[], modifier: number, total: number): string {
    if (rolls.length === 1 && modifier === 0) {
      return total.toString();
    }
    
    const rollsStr = rolls.length === 1 ? rolls[0].toString() : \`[\${rolls.join(', ')}]\`;
    
    if (modifier === 0) {
      return \`\${rollsStr} = \${total}\`;
    }
    
    const modifierStr = modifier > 0 ? \`+\${modifier}\` : modifier.toString();
    return \`\${rollsStr} \${modifierStr} = \${total}\`;
  }
  
  /**
   * Reset mocking configuration
   */
  static resetMocking(): void {
    this.mockConfig = { enabled: false };
  }
  
  /**
   * Check if mocking is enabled (for testing)
   */
  static isMockingEnabled(): boolean {
    return this.mockConfig.enabled;
  }
}

// Common dice roll utilities
export const CommonRolls = {
  d4: () => DiceEngine.roll('1d4'),
  d6: () => DiceEngine.roll('1d6'),
  d8: () => DiceEngine.roll('1d8'),
  d10: () => DiceEngine.roll('1d10'),
  d12: () => DiceEngine.roll('1d12'),
  d20: () => DiceEngine.roll('1d20'),
  d100: () => DiceEngine.roll('1d100'),
  
  // Ability scores (3d6)
  abilityScore: () => DiceEngine.roll('3d6'),
  
  // Hit points for different hit dice
  hitPointsD4: () => DiceEngine.roll('1d4'),
  hitPointsD6: () => DiceEngine.roll('1d6'),
  hitPointsD8: () => DiceEngine.roll('1d8'),
  hitPointsD10: () => DiceEngine.roll('1d10'),
  
  // Attack rolls
  attackRoll: (modifier = 0) => DiceEngine.roll(\`1d20\${modifier >= 0 ? '+' : ''}\${modifier}\`),
  
  // Saving throws
  savingThrow: (modifier = 0) => DiceEngine.roll(\`1d20\${modifier >= 0 ? '+' : ''}\${modifier}\`),
} as const;
`;

  // Check if file already exists
  if (fs.existsSync(DICE_ENGINE_PATH)) {
    console.log('✅ DiceEngine.ts already exists');
    return;
  }

  // Write the dice engine file
  fs.writeFileSync(DICE_ENGINE_PATH, diceEngineContent);

  console.log('✅ Created DiceEngine.ts');
  console.log('🎲 Unified interface for all dice operations');
  console.log('🧪 Built-in mocking support for testing');
  console.log('📊 CommonRolls utilities for frequent operations');
}

function backupOldDiceFile() {
  console.log('💾 Backing up old Dice.ts file...');

  if (!fs.existsSync(OLD_DICE_PATH)) {
    console.log('ℹ️  Old Dice.ts file not found, skipping backup');
    return;
  }

  const backupPath = `${OLD_DICE_PATH}.backup`;
  const content = fs.readFileSync(OLD_DICE_PATH, 'utf8');
  fs.writeFileSync(backupPath, content);

  console.log('✅ Created backup: Dice.ts.backup');
}

function scanForDiceUsage() {
  console.log('🔍 Scanning codebase for dice usage patterns...');

  const sourceDir = path.join(__dirname, '..', 'osric');
  const usagePatterns = {
    'Math.floor(Math.random()': 0,
    'rollDice(': 0,
    'rollMultiple(': 0,
    'new Dice': 0,
    d20: 0,
    d6: 0,
    d4: 0,
    d8: 0,
    d10: 0,
    d12: 0,
    d100: 0,
  };

  function scanFileRecursively(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanFileRecursively(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        for (const pattern of Object.keys(usagePatterns)) {
          const matches = content.match(new RegExp(pattern, 'g'));
          if (matches) {
            usagePatterns[pattern] += matches.length;
          }
        }
      }
    }
  }

  scanFileRecursively(sourceDir);

  console.log('📊 Dice usage patterns found:');
  for (const [pattern, count] of Object.entries(usagePatterns)) {
    if (count > 0) {
      console.log(`  ${pattern}: ${count} occurrences`);
    }
  }

  const totalOccurrences = Object.values(usagePatterns).reduce((sum, count) => sum + count, 0);
  console.log(`📋 Total: ${totalOccurrences} dice-related code patterns to migrate`);

  return usagePatterns;
}

function createMigrationReport(usagePatterns) {
  console.log('📝 Creating dice migration report...');

  const reportPath = path.join(__dirname, 'dice-migration-report.md');

  const reportContent = `# Dice Engine Migration Report

Generated: ${new Date().toISOString()}

## Current Dice Usage Patterns

${Object.entries(usagePatterns)
  .filter(([, count]) => count > 0)
  .map(([pattern, count]) => `- \`${pattern}\`: ${count} occurrences`)
  .join('\\n')}

## Migration Strategy

### Replace Direct Math.random() calls
\`\`\`typescript
// OLD
Math.floor(Math.random() * 20) + 1

// NEW
DiceEngine.roll('1d20').total
// OR
CommonRolls.d20().total
\`\`\`

### Replace old rollDice() calls
\`\`\`typescript
// OLD
rollDice(1, 20, 5)

// NEW
DiceEngine.roll('1d20+5')
\`\`\`

### Update complex dice patterns
\`\`\`typescript
// OLD
const rolls = [];
for (let i = 0; i < 3; i++) {
  rolls.push(Math.floor(Math.random() * 6) + 1);
}

// NEW
const result = DiceEngine.roll('3d6');
const rolls = result.rolls;
\`\`\`

## Testing Updates Required

All test files that mock dice rolls need to use:
\`\`\`typescript
beforeEach(() => {
  DiceEngine.configureMocking({ enabled: true, forcedResults: [10, 15, 8] });
});

afterEach(() => {
  DiceEngine.resetMocking();
});
\`\`\`

## Files to Update

This will be populated by script 12-update-dice-usage.js
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`✅ Created migration report: ${path.relative(__dirname, reportPath)}`);
}

// Main execution
try {
  backupOldDiceFile();
  createDiceEngine();
  const usagePatterns = scanForDiceUsage();
  createMigrationReport(usagePatterns);

  console.log('\\n🎉 Script 03 completed successfully!');
  console.log('🎲 Created unified DiceEngine with mocking support');
  console.log('📊 Scanned codebase for dice usage patterns');
  console.log('📝 Created migration report for dice updates');
  console.log('📋 Next step: Run script 04-update-base-classes.js');
} catch (error) {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}
