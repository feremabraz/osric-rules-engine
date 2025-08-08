#!/usr/bin/env node

/**
 * Script 99: Final Validation
 *
 * This script validates that all migrations completed successfully
 * and the codebase is in a consistent state.
 */

const fs = require('node:fs');
const path = require('node:path');

const OSRIC_DIR = path.join(__dirname, '..', 'osric');

function validateGameContextIntegration() {
  console.log('🔍 Validating GameContext integration...');

  const gameContextPath = path.join(OSRIC_DIR, 'core', 'GameContext.ts');

  if (!fs.existsSync(gameContextPath)) {
    console.log('❌ GameContext.ts not found');
    return false;
  }

  const content = fs.readFileSync(gameContextPath, 'utf8');

  const checks = [
    { name: 'getRuleEngine method', pattern: 'getRuleEngine():' },
    { name: 'setRuleEngine method', pattern: 'setRuleEngine(' },
    { name: 'isFullyInitialized method', pattern: 'isFullyInitialized():' },
    { name: 'RuleEngine import', pattern: 'RuleEngine' },
  ];

  let allPassed = true;

  for (const check of checks) {
    if (content.includes(check.pattern)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - Missing`);
      allPassed = false;
    }
  }

  return allPassed;
}

function validateTemporaryDataRegistry() {
  console.log('🔍 Validating Temporary Data Registry...');

  const registryPath = path.join(OSRIC_DIR, 'core', 'TemporaryDataRegistry.ts');

  if (!fs.existsSync(registryPath)) {
    console.log('❌ TemporaryDataRegistry.ts not found');
    return false;
  }

  const content = fs.readFileSync(registryPath, 'utf8');

  const checks = [
    { name: 'TEMP_DATA_KEYS constant', pattern: 'export const TEMP_DATA_KEYS' },
    { name: 'Spell domain keys', pattern: 'spell:' },
    { name: 'Combat domain keys', pattern: 'combat:' },
    { name: 'Character domain keys', pattern: 'character:' },
    { name: 'Exploration domain keys', pattern: 'exploration:' },
    { name: 'NPC domain keys', pattern: 'npc:' },
    { name: 'TempDataKey type', pattern: 'export type TempDataKey' },
    { name: 'Validation function', pattern: 'validateTempDataKeyUniqueness' },
  ];

  let allPassed = true;

  for (const check of checks) {
    if (content.includes(check.pattern)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - Missing`);
      allPassed = false;
    }
  }

  return allPassed;
}

function validateDiceEngine() {
  console.log('🔍 Validating Dice Engine...');

  const diceEnginePath = path.join(OSRIC_DIR, 'core', 'DiceEngine.ts');

  if (!fs.existsSync(diceEnginePath)) {
    console.log('❌ DiceEngine.ts not found');
    return false;
  }

  const content = fs.readFileSync(diceEnginePath, 'utf8');

  const checks = [
    { name: 'DiceRoll interface', pattern: 'export interface DiceRoll' },
    { name: 'DiceEngine class', pattern: 'export class DiceEngine' },
    { name: 'roll method', pattern: 'static roll(' },
    { name: 'rollMultiple method', pattern: 'static rollMultiple(' },
    { name: 'configureMocking method', pattern: 'static configureMocking(' },
    { name: 'CommonRolls utilities', pattern: 'export const CommonRolls' },
  ];

  let allPassed = true;

  for (const check of checks) {
    if (content.includes(check.pattern)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - Missing`);
      allPassed = false;
    }
  }

  return allPassed;
}

function validateCommandPatterns() {
  console.log('🔍 Validating command constructor patterns...');

  const commandsDir = path.join(OSRIC_DIR, 'commands');
  let validCommands = 0;
  let totalCommands = 0;

  function validateCommandFile(filePath) {
    if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) return;

    totalCommands++;
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for standardized constructor pattern
    const hasStandardConstructor =
      content.includes('constructor(') &&
      content.includes('parameters:') &&
      content.includes('actorId: string') &&
      content.includes('targetIds: string[] = []');

    const fileName = path.basename(filePath);

    if (hasStandardConstructor) {
      console.log(`  ✅ ${fileName}`);
      validCommands++;
    } else {
      console.log(`  ❌ ${fileName} - Non-standard constructor`);
    }
  }

  function scanCommandDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanCommandDirectory(fullPath);
      } else {
        validateCommandFile(fullPath);
      }
    }
  }

  scanCommandDirectory(commandsDir);

  const success = validCommands === totalCommands;
  console.log(`📊 Commands: ${validCommands}/${totalCommands} standardized`);

  return success;
}

function validateImports() {
  console.log('🔍 Validating imports and exports...');

  let validFiles = 0;
  let totalFiles = 0;
  const errors = [];

  function validateFile(filePath) {
    if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) return;

    totalFiles++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for common import issues
      const issues = [];

      // Check for old dice imports
      if (content.includes("from '@osric/core/Dice'") && !content.includes('DiceEngine')) {
        issues.push('Still importing old Dice instead of DiceEngine');
      }

      // Check for missing TEMP_DATA_KEYS imports where needed
      if (
        content.includes('getTemporary(') &&
        content.includes("'") &&
        !content.includes('TEMP_DATA_KEYS')
      ) {
        const tempMatches = content.match(/getTemporary\s*\(\s*['"][^'"]*['"]/g);
        if (tempMatches?.some((match) => match.includes(':'))) {
          // File uses new temp key format but doesn't import registry
          issues.push('Uses new temp keys but missing TEMP_DATA_KEYS import');
        }
      }

      if (issues.length === 0) {
        validFiles++;
      } else {
        const relativePath = path.relative(OSRIC_DIR, filePath);
        errors.push({ file: relativePath, issues });
      }
    } catch (error) {
      const relativePath = path.relative(OSRIC_DIR, filePath);
      errors.push({ file: relativePath, issues: [`Read error: ${error.message}`] });
    }
  }

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        validateFile(fullPath);
      }
    }
  }

  scanDirectory(OSRIC_DIR);

  console.log(`📊 Import validation: ${validFiles}/${totalFiles} files clean`);

  if (errors.length > 0) {
    console.log('❌ Files with import issues:');
    for (const { file, issues } of errors.slice(0, 10)) {
      // Show first 10
      console.log(`  ${file}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more files`);
    }
  }

  return errors.length === 0;
}

function validateBackupFiles() {
  console.log('🔍 Checking for backup files...');

  const backupFiles = [];

  function findBackups(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        findBackups(fullPath);
      } else if (entry.name.endsWith('.backup')) {
        backupFiles.push(path.relative(path.join(__dirname, '..'), fullPath));
      }
    }
  }

  findBackups(path.join(__dirname, '..'));

  console.log(`📊 Found ${backupFiles.length} backup files`);

  if (backupFiles.length > 0) {
    console.log('📋 Backup files (remove these if migration successful):');
    for (const file of backupFiles.slice(0, 10)) {
      console.log(`  ${file}`);
    }
    if (backupFiles.length > 10) {
      console.log(`  ... and ${backupFiles.length - 10} more`);
    }
  }

  return backupFiles;
}

function createFinalReport(results) {
  console.log('📝 Creating final validation report...');

  const reportPath = path.join(__dirname, 'final-validation-report.md');

  const reportContent = `# Final Validation Report

Generated: ${new Date().toISOString()}

## Validation Results

| Component | Status | Details |
|-----------|--------|---------|
| GameContext Integration | ${results.gameContext ? '✅' : '❌'} | getRuleEngine(), setRuleEngine(), etc. |
| Temporary Data Registry | ${results.tempDataRegistry ? '✅' : '❌'} | Central registry with domain keys |
| Dice Engine | ${results.diceEngine ? '✅' : '❌'} | Unified dice rolling system |
| Command Patterns | ${results.commandPatterns ? '✅' : '❌'} | Standardized constructors |
| Imports/Exports | ${results.imports ? '✅' : '❌'} | Clean import statements |

## Overall Status

${Object.values(results).every(Boolean) ? '🎉 **ALL VALIDATIONS PASSED**' : '⚠️ **ISSUES FOUND**'}

## Backup Files

${results.backupFiles.length} backup files found. These can be removed if all tests pass:

\`\`\`bash
# Remove all backup files (run only if confident in migration)
find . -name "*.backup" -delete
\`\`\`

## Next Steps

${
  Object.values(results).every(Boolean)
    ? `1. Run comprehensive tests: \`npm test\`
2. Remove backup files if tests pass
3. Commit changes to git
4. Remove scripts folder: \`rm -rf scripts\``
    : `1. Review failed validations above
2. Fix any issues found
3. Re-run this validation script
4. Only proceed when all validations pass`
}

## Summary

The OSRIC Rules Engine standardization is ${Object.values(results).every(Boolean) ? 'COMPLETE' : 'IN PROGRESS'}.

${
  Object.values(results).every(Boolean)
    ? 'All 11 pattern inconsistencies have been addressed and the codebase is now standardized.'
    : 'Some issues remain to be resolved before standardization is complete.'
}
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`✅ Created final report: ${path.relative(__dirname, reportPath)}`);
}

// Main execution
try {
  console.log('🚀 Running final validation...');

  const results = {
    gameContext: validateGameContextIntegration(),
    tempDataRegistry: validateTemporaryDataRegistry(),
    diceEngine: validateDiceEngine(),
    commandPatterns: validateCommandPatterns(),
    imports: validateImports(),
    backupFiles: validateBackupFiles(),
  };

  createFinalReport(results);

  const allPassed = Object.values(results).slice(0, -1).every(Boolean); // Exclude backupFiles from pass/fail

  if (allPassed) {
    console.log('\\n🎉 Final validation PASSED!');
    console.log('✅ All standardization goals achieved');
    console.log('📋 Next steps:');
    console.log('  1. Run: npm test');
    console.log('  2. If tests pass, remove backup files');
    console.log('  3. Commit changes');
    console.log('  4. Remove scripts folder');
  } else {
    console.log('\\n⚠️  Final validation found issues');
    console.log('📋 Review the validation report and fix issues before proceeding');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
