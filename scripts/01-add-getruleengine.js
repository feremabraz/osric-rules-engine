#!/usr/bin/env node

/**
 * Script 01: Add GameContext.getRuleEngine() method
 *
 * This script adds the missing getRuleEngine() method to GameContext
 * and updates the constructor to accept a RuleEngine parameter.
 */

const fs = require('node:fs');
const path = require('node:path');

const GAME_CONTEXT_PATH = path.join(__dirname, '..', 'osric', 'core', 'GameContext.ts');

function addGetRuleEngineMethod() {
  console.log('🔧 Adding GameContext.getRuleEngine() method...');

  if (!fs.existsSync(GAME_CONTEXT_PATH)) {
    console.error('❌ GameContext.ts not found at:', GAME_CONTEXT_PATH);
    process.exit(1);
  }

  // Read current file
  const content = fs.readFileSync(GAME_CONTEXT_PATH, 'utf8');

  // Create backup
  fs.writeFileSync(`${GAME_CONTEXT_PATH}.backup`, content);
  console.log('💾 Created backup: GameContext.ts.backup');

  // Check if already updated
  if (content.includes('getRuleEngine()')) {
    console.log('✅ GameContext already has getRuleEngine() method');
    return;
  }

  // Add RuleEngine import
  let updatedContent = content;

  if (!content.includes('import type { RuleEngine }')) {
    // Find the last import from @osric/types/entities specifically
    const entitiesImportMatch = content.match(
      /import\s+.*?\s+from\s+['"]@osric\/types\/entities['"];/
    );
    if (entitiesImportMatch) {
      updatedContent = updatedContent.replace(
        entitiesImportMatch[0],
        `${entitiesImportMatch[0]}\nimport type { RuleEngine } from '@osric/core/RuleEngine';`
      );
    } else {
      // If no entities import found, add after any existing imports
      const lastImportMatch = updatedContent.match(/import[^;]+;/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        updatedContent = updatedContent.replace(
          lastImport,
          `${lastImport}\nimport type { RuleEngine } from '@osric/core/RuleEngine';`
        );
      }
    }
  }

  // Update constructor to accept RuleEngine (handle various formatting)
  const constructorPattern =
    /constructor\s*\(\s*private\s+store:\s*ReturnType<typeof\s+createStore>\s*\)\s*\{\s*\}/;
  if (constructorPattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(
      constructorPattern,
      `constructor(
    private store: ReturnType<typeof createStore>,
    private ruleEngine?: RuleEngine
  ) {}`
    );
  } else {
    console.log('⚠️  Constructor pattern not found - may need manual update');
  }

  // Add the new methods before the getEntity method
  const newMethods = `
  getRuleEngine(): RuleEngine {
    if (!this.ruleEngine) {
      throw new Error('RuleEngine not initialized in GameContext. Call setRuleEngine() first.');
    }
    return this.ruleEngine;
  }

  setRuleEngine(engine: RuleEngine): void {
    this.ruleEngine = engine;
  }

  isFullyInitialized(): boolean {
    return this.ruleEngine !== undefined;
  }

`;

  updatedContent = updatedContent.replace(
    /getEntity<T extends GameEntity>\(id: string\): T \| null \{/,
    `${newMethods}  getEntity<T extends GameEntity>(id: string): T | null {`
  );

  // Write updated file
  fs.writeFileSync(GAME_CONTEXT_PATH, updatedContent);

  console.log('✅ Successfully added getRuleEngine() method to GameContext');
  console.log('📝 Updated constructor to accept RuleEngine parameter');
  console.log('🔗 Added setRuleEngine() and isFullyInitialized() methods');
}

function updateTestFiles() {
  console.log('🧪 Updating test files to use new GameContext constructor...');

  const testDir = path.join(__dirname, '..', '__tests__');
  const helperFiles = [
    path.join(testDir, 'helpers'),
    path.join(testDir, 'core'),
    path.join(testDir, 'commands'),
    path.join(testDir, 'rules'),
    path.join(testDir, 'entities'),
    path.join(testDir, 'integration'),
  ];

  let updatedCount = 0;

  function updateFileRecursively(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        updateFileRecursively(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Look for GameContext instantiation patterns
        if (
          content.includes('new GameContext(') &&
          !content.includes('new GameContext(store, ruleEngine)')
        ) {
          let updatedContent = content;

          // Add RuleEngine import if needed
          if (
            !content.includes('import { RuleEngine }') &&
            !content.includes('import type { RuleEngine }')
          ) {
            updatedContent = updatedContent.replace(
              /import.*from.*GameContext.*';/,
              `$&\nimport { RuleEngine } from '@osric/core/RuleEngine';`
            );
          }

          // Update GameContext constructor calls
          updatedContent = updatedContent.replace(
            /new GameContext\(([^)]+)\)/g,
            'new GameContext($1, new RuleEngine())'
          );

          // Handle test helpers that create mock contexts
          updatedContent = updatedContent.replace(
            /const context = new GameContext\(store\);/g,
            `const context = new GameContext(store);
  context.setRuleEngine(new RuleEngine());`
          );

          if (updatedContent !== content) {
            fs.writeFileSync(fullPath, updatedContent);
            updatedCount++;
            console.log(`  ✅ Updated: ${path.relative(__dirname, fullPath)}`);
          }
        }
      }
    }
  }

  helperFiles.forEach(updateFileRecursively);

  console.log(`✅ Updated ${updatedCount} test files`);
}

// Main execution
try {
  addGetRuleEngineMethod();
  updateTestFiles();
  console.log('\n🎉 Script 01 completed successfully!');
  console.log('📋 Next step: Run script 02-create-temp-data-registry.js');
} catch (error) {
  console.error('❌ Script failed:', error.message);
  console.log(
    '🔙 Restore backup with: cp osric/core/GameContext.ts.backup osric/core/GameContext.ts'
  );
  process.exit(1);
}
