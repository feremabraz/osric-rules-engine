#!/usr/bin/env node

/**
 * Script 11: Migrate Temporary Data Keys
 *
 * This script replaces all old temporary data key patterns with
 * standardized keys from the central registry.
 */

const fs = require('node:fs');
const path = require('node:path');

const SOURCE_DIRS = [
  path.join(__dirname, '..', 'osric', 'commands'),
  path.join(__dirname, '..', 'osric', 'rules'),
  path.join(__dirname, '..', 'osric', 'core'),
];

// Old key -> New key mapping
const KEY_MIGRATIONS = {
  // Spell system underscore patterns -> new domain patterns
  castSpell_caster: 'TEMP_DATA_KEYS.spell.CAST_CASTER',
  castSpell_spell: 'TEMP_DATA_KEYS.spell.CAST_SPELL',
  castSpell_overrideComponents: 'TEMP_DATA_KEYS.spell.CAST_COMPONENTS',
  scrollCreation_characterId: 'TEMP_DATA_KEYS.spell.SCROLL_READER',
  scrollCreation_spellLevel: 'TEMP_DATA_KEYS.spell.SCROLL_CONTEXT',
  newMagicItem: 'TEMP_DATA_KEYS.spell.IDENTIFY_ITEM',
  magicItemToUse: 'TEMP_DATA_KEYS.spell.IDENTIFY_ITEM',
  identificationAttempt: 'TEMP_DATA_KEYS.spell.IDENTIFY_CONTEXT',

  // Combat keys
  'attack-context': 'TEMP_DATA_KEYS.combat.ATTACK_CONTEXT',
  'initiative-context': 'TEMP_DATA_KEYS.combat.INITIATIVE_CONTEXT',

  // Character keys
  'character-creation': 'TEMP_DATA_KEYS.character.CREATE_PARAMS',
  'generated-ability-scores': 'TEMP_DATA_KEYS.character.CREATE_ABILITY_SCORES',
  'adjusted-ability-scores': 'TEMP_DATA_KEYS.character.CREATE_ADJUSTED_SCORES',
  'saving-throw-params': 'TEMP_DATA_KEYS.character.SAVING_THROW_PARAMS',
  'level-benefits': 'TEMP_DATA_KEYS.character.LEVEL_UP_BENEFITS',

  // Exploration keys
  'search-request-params': 'TEMP_DATA_KEYS.exploration.SEARCH_PARAMS',
  'weather-effects': 'TEMP_DATA_KEYS.exploration.WEATHER_CHECK_CONDITIONS',

  // NPC keys
  'monster-generation-params': 'TEMP_DATA_KEYS.npc.MONSTER_GEN_PARAMS',
  'reaction-roll-params': 'TEMP_DATA_KEYS.npc.REACTION_ROLL_PARAMS',
};

function scanForTemporaryDataUsage() {
  console.log('🔍 Scanning for temporary data key usage...');

  const foundUsages = {};
  let totalFiles = 0;
  let filesWithUsage = 0;

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        totalFiles++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(path.join(__dirname, '..'), fullPath);

        let fileHasUsage = false;

        // Look for getTemporary and setTemporary calls
        const tempDataMatches = content.match(/[gs]etTemporary\\([^)]+\\)/g) || [];

        for (const match of tempDataMatches) {
          fileHasUsage = true;

          // Extract the key from the call
          const keyMatch = match.match(/['"]([^'"]+)['"]/);
          if (keyMatch) {
            const key = keyMatch[1];
            if (!foundUsages[key]) {
              foundUsages[key] = [];
            }
            foundUsages[key].push(relativePath);
          }
        }

        if (fileHasUsage) {
          filesWithUsage++;
        }
      }
    }
  }

  for (const dir of SOURCE_DIRS) {
    scanDirectory(dir);
  }

  console.log(
    `📊 Scanned ${totalFiles} files, found temporary data usage in ${filesWithUsage} files`
  );
  console.log(`🔑 Found ${Object.keys(foundUsages).length} unique temporary data keys`);

  return foundUsages;
}

function createMigrationPlan(foundUsages) {
  console.log('📋 Creating migration plan...');

  const migrationPlan = {
    autoMigrate: {},
    manualReview: {},
    unmapped: {},
  };

  for (const [key, files] of Object.entries(foundUsages)) {
    if (KEY_MIGRATIONS[key]) {
      migrationPlan.autoMigrate[key] = {
        newKey: KEY_MIGRATIONS[key],
        files: files,
        count: files.length,
      };
    } else if (key.includes('_') || key.includes('-')) {
      migrationPlan.manualReview[key] = {
        files: files,
        count: files.length,
        suggestion: suggestNewKey(key),
      };
    } else {
      migrationPlan.unmapped[key] = {
        files: files,
        count: files.length,
      };
    }
  }

  console.log('📊 Migration plan summary:');
  console.log(`  ✅ Auto-migrate: ${Object.keys(migrationPlan.autoMigrate).length} keys`);
  console.log(`  👀 Manual review: ${Object.keys(migrationPlan.manualReview).length} keys`);
  console.log(`  ❓ Unmapped: ${Object.keys(migrationPlan.unmapped).length} keys`);

  return migrationPlan;
}

function suggestNewKey(oldKey) {
  // Simple heuristics to suggest new keys
  if (oldKey.includes('spell') || oldKey.includes('cast') || oldKey.includes('scroll')) {
    return 'TEMP_DATA_KEYS.spell.* (determine specific key)';
  }
  if (oldKey.includes('attack') || oldKey.includes('combat') || oldKey.includes('initiative')) {
    return 'TEMP_DATA_KEYS.combat.* (determine specific key)';
  }
  if (oldKey.includes('character') || oldKey.includes('level') || oldKey.includes('ability')) {
    return 'TEMP_DATA_KEYS.character.* (determine specific key)';
  }
  if (oldKey.includes('search') || oldKey.includes('move') || oldKey.includes('weather')) {
    return 'TEMP_DATA_KEYS.exploration.* (determine specific key)';
  }
  if (oldKey.includes('monster') || oldKey.includes('npc') || oldKey.includes('reaction')) {
    return 'TEMP_DATA_KEYS.npc.* (determine specific key)';
  }
  return 'Manual mapping required';
}

function performAutoMigration(migrationPlan) {
  console.log('🔄 Performing automatic key migration...');

  let migratedFiles = 0;
  let totalReplacements = 0;
  const errors = [];

  // Get all unique files that need migration
  const filesToMigrate = new Set();

  for (const migration of Object.values(migrationPlan.autoMigrate)) {
    for (const file of migration.files) {
      filesToMigrate.add(file);
    }
  }

  for (const relativeFilePath of filesToMigrate) {
    try {
      const fullPath = path.join(__dirname, '..', relativeFilePath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Create backup
      fs.writeFileSync(`${fullPath}.backup`, content);

      let updatedContent = content;
      let fileReplacements = 0;

      // Add import for TEMP_DATA_KEYS if not present
      if (
        !updatedContent.includes('TEMP_DATA_KEYS') &&
        !updatedContent.includes('TemporaryDataRegistry')
      ) {
        // Find a good place to add the import
        const lastImportMatch = updatedContent.match(
          /import[^;]+;(?=\\s*(?:import|\\n\\n|export|const|class|interface))/g
        );
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1];
          updatedContent = updatedContent.replace(
            lastImport,
            `${lastImport}\\nimport { TEMP_DATA_KEYS } from '@osric/core/TemporaryDataRegistry';`
          );
        }
      }

      // Perform key replacements
      for (const [oldKey, migration] of Object.entries(migrationPlan.autoMigrate)) {
        if (migration.files.includes(relativeFilePath)) {
          // Replace quoted keys in getTemporary/setTemporary calls
          const oldKeyPattern = new RegExp(
            `(['"])${oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`,
            'g'
          );
          const replacementCount = (updatedContent.match(oldKeyPattern) || []).length;

          if (replacementCount > 0) {
            updatedContent = updatedContent.replace(oldKeyPattern, migration.newKey);
            fileReplacements += replacementCount;
            totalReplacements += replacementCount;
          }
        }
      }

      if (fileReplacements > 0) {
        fs.writeFileSync(fullPath, updatedContent);
        console.log(`  ✅ ${relativeFilePath}: ${fileReplacements} replacements`);
        migratedFiles++;
      }
    } catch (error) {
      console.log(`  ❌ ${relativeFilePath}: ${error.message}`);
      errors.push({ file: relativeFilePath, error: error.message });
    }
  }

  console.log('\\n📊 Auto-migration results:');
  console.log(`  ✅ Files migrated: ${migratedFiles}`);
  console.log(`  🔄 Total replacements: ${totalReplacements}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  return { migratedFiles, totalReplacements, errors };
}

function createMigrationReport(foundUsages, migrationPlan, results) {
  console.log('📝 Creating migration report...');

  const reportPath = path.join(__dirname, 'temp-key-migration-report.md');

  const reportContent = `# Temporary Data Key Migration Report

Generated: ${new Date().toISOString()}

## Summary

- **Total unique keys found**: ${Object.keys(foundUsages).length}
- **Auto-migrated keys**: ${Object.keys(migrationPlan.autoMigrate).length}
- **Files migrated**: ${results.migratedFiles}
- **Total replacements**: ${results.totalReplacements}

## Auto-Migrated Keys

${Object.entries(migrationPlan.autoMigrate)
  .map(
    ([oldKey, migration]) =>
      `### \`${oldKey}\` → \`${migration.newKey}\`
- **Usage count**: ${migration.count}
- **Files**: ${migration.files.join(', ')}`
  )
  .join('\\n\\n')}

## Keys Requiring Manual Review

${Object.entries(migrationPlan.manualReview)
  .map(
    ([key, info]) =>
      `### \`${key}\`
- **Usage count**: ${info.count}
- **Files**: ${info.files.join(', ')}
- **Suggested mapping**: ${info.suggestion}`
  )
  .join('\\n\\n')}

## Unmapped Keys

${Object.entries(migrationPlan.unmapped)
  .map(
    ([key, info]) =>
      `### \`${key}\`
- **Usage count**: ${info.count}
- **Files**: ${info.files.join(', ')}`
  )
  .join('\\n\\n')}

## Next Steps

1. Review manually mapped keys and update them
2. Test the application to ensure all functionality works
3. Remove .backup files once migration is confirmed successful
4. Run comprehensive tests to validate changes

## Rollback Instructions

If issues are found, restore from backups:
\`\`\`bash
find osric -name "*.backup" -exec sh -c 'mv "$1" "\${1%.backup}"' _ {} \\;
\`\`\`
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`✅ Created migration report: ${path.relative(__dirname, reportPath)}`);
}

// Main execution
try {
  console.log('🚀 Starting temporary data key migration...');

  const foundUsages = scanForTemporaryDataUsage();
  const migrationPlan = createMigrationPlan(foundUsages);
  const results = performAutoMigration(migrationPlan);

  createMigrationReport(foundUsages, migrationPlan, results);

  console.log('\\n🎉 Script 11 completed!');
  console.log('📊 Automatic migration completed for mapped keys');
  console.log('👀 Check migration report for keys requiring manual review');
  console.log('🧪 Run tests to validate changes');
  console.log('📋 Next step: Run script 12-update-dice-usage.js');
} catch (error) {
  console.error('❌ Script failed:', error.message);
  console.log(
    '🔙 Restore backups if needed: find osric -name "*.backup" -exec sh -c \'mv "$1" "${1%.backup}"\' _ {} \\;'
  );
  process.exit(1);
}
