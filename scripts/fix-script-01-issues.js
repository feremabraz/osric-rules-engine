#!/usr/bin/env node

/**
 * Fix Script 01 Issues
 *
 * This script fixes the syntax errors created by the first migration script
 * by properly handling the malformed GameContext constructor calls.
 */

const fs = require('node:fs');
const path = require('node:path');

function fixMalformedGameContextCalls() {
  console.log('🔧 Fixing malformed GameContext constructor calls...');

  const testDir = path.join(__dirname, '..', '__tests__');
  let fixedCount = 0;

  function fixFileRecursively(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        fixFileRecursively(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        let updatedContent = content;
        let hasChanges = false;

        // Fix malformed createStore calls like: createStore(, new RuleEngine())
        const malformedPattern = /createStore\(\s*,\s*new RuleEngine\(\)\)/g;
        if (malformedPattern.test(content)) {
          updatedContent = updatedContent.replace(
            /new GameContext\(createStore\(\s*,\s*new RuleEngine\(\)\)\)/g,
            'new GameContext(createStore())'
          );
          hasChanges = true;
        }

        // Fix any other malformed patterns
        // Pattern: new GameContext(something,, new RuleEngine())
        updatedContent = updatedContent.replace(
          /new GameContext\(([^,)]+),\s*,\s*new RuleEngine\(\)\)/g,
          'new GameContext($1)'
        );

        if (updatedContent !== content) {
          hasChanges = true;
        }

        // Now properly add RuleEngine parameter where needed
        if (hasChanges) {
          // Add RuleEngine import if not present
          if (
            !updatedContent.includes('import { RuleEngine }') &&
            !updatedContent.includes('import type { RuleEngine }')
          ) {
            const gameContextImportMatch = updatedContent.match(
              /import\s+.*GameContext.*from\s+['"][^'"]*['"];/
            );
            if (gameContextImportMatch) {
              updatedContent = updatedContent.replace(
                gameContextImportMatch[0],
                `${gameContextImportMatch[0]}\nimport { RuleEngine } from '@osric/core/RuleEngine';`
              );
            }
          }

          // Properly add RuleEngine parameter to single-parameter calls
          updatedContent = updatedContent.replace(
            /new GameContext\(createStore\(\)\)/g,
            'new GameContext(createStore(), new RuleEngine())'
          );

          fs.writeFileSync(fullPath, updatedContent);
          fixedCount++;
          console.log(`  ✅ Fixed: ${path.relative(__dirname, fullPath)}`);
        }
      }
    }
  }

  function fixDirectories(dirs) {
    for (const dir of dirs) {
      const fullDir = path.join(testDir, dir);
      if (fs.existsSync(fullDir)) {
        fixFileRecursively(fullDir);
      }
    }
  }

  // Fix all test directories
  fixDirectories(['commands', 'core', 'rules', 'entities', 'integration']);

  console.log(`✅ Fixed ${fixedCount} files with malformed GameContext calls`);
}

function fixDuplicateRuleEngineImports() {
  console.log('🔧 Fixing duplicate RuleEngine imports...');

  const testFile = path.join(__dirname, '..', '__tests__', 'core', 'RuleEngine.test.ts');

  if (fs.existsSync(testFile)) {
    const content = fs.readFileSync(testFile, 'utf8');

    // Remove duplicate RuleEngine import
    const lines = content.split('\n');
    const seenImports = new Set();
    const filteredLines = lines.filter((line) => {
      if (line.includes('import { RuleEngine }') || line.includes('import { RuleEngine,')) {
        if (seenImports.has('RuleEngine')) {
          return false; // Skip duplicate
        }
        seenImports.add('RuleEngine');
      }
      return true;
    });

    if (filteredLines.length !== lines.length) {
      fs.writeFileSync(testFile, filteredLines.join('\n'));
      console.log('  ✅ Fixed duplicate RuleEngine import in RuleEngine.test.ts');
    }
  }
}

// Main execution
try {
  fixMalformedGameContextCalls();
  fixDuplicateRuleEngineImports();

  console.log('\n🎉 Fix script completed successfully!');
  console.log('📋 Now run: pnpm lint && pnpm typecheck');
  console.log('📋 If still errors, check specific files manually');
} catch (error) {
  console.error('❌ Fix script failed:', error.message);
  process.exit(1);
}
