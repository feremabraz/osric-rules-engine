#!/usr/bin/env node

/**
 * Script 05: Migrate Constructor Patterns
 *
 * This script standardizes all command constructors to use the same pattern:
 * constructor(parameters: TParams, actorId: string, targetIds: string[] = [])
 */

const fs = require('node:fs');
const path = require('node:path');

const COMMANDS_DIR = path.join(__dirname, '..', 'osric', 'commands');

// Map of command files and their current constructor patterns
const COMMAND_FILES = [
  'character/CreateCharacterCommand.ts',
  'character/GainExperienceCommand.ts',
  'character/LevelUpCommand.ts',
  'character/SavingThrowCommand.ts',
  'character/ThiefSkillCheckCommand.ts',
  'character/TurnUndeadCommand.ts',
  'combat/AttackCommand.ts',
  'combat/GrappleCommand.ts',
  'combat/InitiativeCommand.ts',
  'exploration/FallingDamageCommand.ts',
  'exploration/ForagingCommand.ts',
  'exploration/MoveCommand.ts',
  'exploration/SearchCommand.ts',
  'exploration/TerrainNavigationCommand.ts',
  'exploration/WeatherCheckCommand.ts',
  'npc/MonsterGenerationCommand.ts',
  'npc/ReactionRollCommand.ts',
  'spells/CastSpellCommand.ts',
  'spells/MemorizeSpellCommand.ts',
  'spells/ScrollReadCommand.ts',
  'spells/IdentifyMagicItemCommand.ts',
];

function analyzeConstructorPatterns() {
  console.log('🔍 Analyzing current constructor patterns...');

  const patterns = {
    'Pattern 1 (params + actorId default)': [],
    'Pattern 2 (params + actorId required)': [],
    'Pattern 3 (individual params)': [],
    'Pattern 4 (complex embedded)': [],
    'Pattern 5 (mixed params)': [],
    'Unknown pattern': [],
  };

  let totalFiles = 0;

  for (const commandFile of COMMAND_FILES) {
    const filePath = path.join(COMMANDS_DIR, commandFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${commandFile}`);
      continue;
    }

    totalFiles++;
    const content = fs.readFileSync(filePath, 'utf8');

    // Analyze constructor pattern
    const constructorMatch = content.match(/constructor\([^{]+\{/s);
    if (!constructorMatch) {
      patterns['Unknown pattern'].push(commandFile);
      continue;
    }

    const constructorSignature = constructorMatch[0];

    if (
      constructorSignature.includes('private parameters') &&
      constructorSignature.includes('actorId = ')
    ) {
      patterns['Pattern 1 (params + actorId default)'].push(commandFile);
    } else if (
      constructorSignature.includes('private parameters') &&
      constructorSignature.includes('actorId: string')
    ) {
      patterns['Pattern 2 (params + actorId required)'].push(commandFile);
    } else if (
      constructorSignature.includes('casterId: string') ||
      constructorSignature.includes('readerId: string')
    ) {
      patterns['Pattern 3 (individual params)'].push(commandFile);
    } else if (constructorSignature.includes('auto-generated')) {
      patterns['Pattern 4 (complex embedded)'].push(commandFile);
    } else if (constructorSignature.includes('parameters.characterId')) {
      patterns['Pattern 5 (mixed params)'].push(commandFile);
    } else {
      patterns['Unknown pattern'].push(commandFile);
    }
  }

  console.log('📊 Constructor pattern analysis:');
  for (const [pattern, files] of Object.entries(patterns)) {
    if (files.length > 0) {
      console.log(`  ${pattern}: ${files.length} files`);
      for (const file of files) {
        console.log(`    - ${file}`);
      }
    }
  }

  console.log(`\\n📋 Total files to migrate: ${totalFiles}`);
  return patterns;
}

function migrateCommandFile(commandFile) {
  const filePath = path.join(COMMANDS_DIR, commandFile);
  const content = fs.readFileSync(filePath, 'utf8');

  // Create backup
  fs.writeFileSync(`${filePath}.backup`, content);

  let updatedContent = content;

  // Extract parameter type from existing constructor or class
  const paramTypeMatch = content.match(/private parameters: (\\w+)/);
  const _paramType = paramTypeMatch ? paramTypeMatch[1] : 'unknown';

  // Pattern 1: Single parameters object with default actorId
  updatedContent = updatedContent.replace(
    /constructor\(private parameters: (\w+), actorId = '[^']*'\) \{\s*super\(actorId\);/,
    `constructor(
    parameters: $1,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
  );

  // Pattern 2: Parameters + actorId required
  updatedContent = updatedContent.replace(
    /constructor\(private parameters: (\w+), actorId: string\) \{\s*super\(actorId\);/,
    `constructor(
    parameters: $1,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
  );

  // Pattern 3: Individual parameters (spell commands)
  // CastSpellCommand
  if (commandFile.includes('CastSpellCommand')) {
    // First, we need to create the parameters interface
    const parametersInterface = `
interface CastSpellParameters {
  spellName: string;
  spellLevel?: number;
  components?: SpellComponent[];
  overrideRequirements?: boolean;
}

`;

    // Add interface before the class
    updatedContent = updatedContent.replace(
      /export class CastSpellCommand/,
      `${parametersInterface}export class CastSpellCommand`
    );

    // Update constructor
    updatedContent = updatedContent.replace(
      /constructor\(casterId: string, private spellName: string, targetIds: string\[\] = \[\]\) \{\s*super\(casterId, targetIds\);/,
      `constructor(
    parameters: CastSpellParameters,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
    );

    // Update references to this.spellName to this.parameters.spellName
    updatedContent = updatedContent.replace(/this\.spellName/g, 'this.parameters.spellName');
  }

  // MemorizeSpellCommand
  if (commandFile.includes('MemorizeSpellCommand')) {
    const parametersInterface = `
interface MemorizeSpellParameters {
  spellName: string;
  spellLevel: number;
  replaceSpell?: string;
  spellSlot?: number;
}

`;

    updatedContent = updatedContent.replace(
      /export class MemorizeSpellCommand/,
      `${parametersInterface}export class MemorizeSpellCommand`
    );

    updatedContent = updatedContent.replace(
      /constructor\([^{]+\{[^}]+super\([^)]+\);?/s,
      `constructor(
    parameters: MemorizeSpellParameters,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
    );
  }

  // ScrollReadCommand
  if (commandFile.includes('ScrollReadCommand')) {
    const parametersInterface = `
interface ScrollReadParameters {
  scrollId: string;
  overrideRequirements?: boolean;
}

`;

    updatedContent = updatedContent.replace(
      /export class ScrollReadCommand/,
      `${parametersInterface}export class ScrollReadCommand`
    );

    updatedContent = updatedContent.replace(
      /constructor\(readerId: string, private scrollId: string, targetIds: string\[\] = \[\]\) \{\s*super\(readerId, targetIds\);/,
      `constructor(
    parameters: ScrollReadParameters,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
    );

    updatedContent = updatedContent.replace(/this\.scrollId/g, 'this.parameters.scrollId');
  }

  // IdentifyMagicItemCommand
  if (commandFile.includes('IdentifyMagicItemCommand')) {
    const parametersInterface = `
interface IdentifyMagicItemParameters {
  itemId: string;
  method: 'spell' | 'sage' | 'trial';
  spellName?: string;
}

`;

    updatedContent = updatedContent.replace(
      /export class IdentifyMagicItemCommand/,
      `${parametersInterface}export class IdentifyMagicItemCommand`
    );

    updatedContent = updatedContent.replace(
      /constructor\([^{]+\{[^}]+super\([^)]+\);/s,
      `constructor(
    parameters: IdentifyMagicItemParameters,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
    );
  }

  // Pattern 4: Complex embedded parameters (auto-generated IDs)
  updatedContent = updatedContent.replace(
    /constructor\(private parameters: (\w+)\) \{\s*super\(`auto-generated-\${Date\.now\(\)}`\);/,
    `constructor(
    parameters: $1,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
  );

  // Pattern 5: Mixed parameter with ID extraction
  updatedContent = updatedContent.replace(
    /constructor\(private parameters: (\w+)\) \{\s*super\(parameters\.characterId, parameters\.[^}]+\);/,
    `constructor(
    parameters: $1,
    actorId: string,
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);`
  );

  // Update class property declaration to use public readonly
  updatedContent = updatedContent.replace(/private parameters:/, 'public readonly parameters:');

  // Add actorId and targetIds properties if they don't exist
  if (!updatedContent.includes('public readonly actorId')) {
    updatedContent = updatedContent.replace(
      /public readonly parameters: (\w+);/,
      `public readonly parameters: $1;
  public readonly actorId: string;
  public readonly targetIds: string[];`
    );
  }

  return updatedContent;
}

function migrateAllCommands() {
  console.log('🔄 Migrating all command constructors...');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const commandFile of COMMAND_FILES) {
    try {
      console.log(`  Processing: ${commandFile}`);

      const filePath = path.join(COMMANDS_DIR, commandFile);

      if (!fs.existsSync(filePath)) {
        console.log('    ⚠️  File not found, skipping');
        continue;
      }

      const updatedContent = migrateCommandFile(commandFile);
      fs.writeFileSync(filePath, updatedContent);

      console.log('    ✅ Migrated successfully');
      successCount++;
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
      errors.push({ file: commandFile, error: error.message });
      errorCount++;
    }
  }

  console.log('\n📊 Migration Results:');
  console.log(`  ✅ Successful: ${successCount} files`);
  console.log(`  ❌ Errors: ${errorCount} files`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    for (const { file, error } of errors) {
      console.log(`  ${file}: ${error}`);
    }
  }

  return { successCount, errorCount, errors };
}

function validateMigration() {
  console.log('🔍 Validating migration results...');

  let validCount = 0;
  let invalidCount = 0;

  for (const commandFile of COMMAND_FILES) {
    const filePath = path.join(COMMANDS_DIR, commandFile);

    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');

    // Check for standardized constructor pattern
    const hasStandardConstructor =
      content.includes('constructor(') &&
      content.includes('parameters:') &&
      content.includes('actorId: string') &&
      content.includes('targetIds: string[] = []');

    if (hasStandardConstructor) {
      validCount++;
      console.log(`  ✅ ${commandFile}`);
    } else {
      invalidCount++;
      console.log(`  ❌ ${commandFile} - Constructor pattern not standardized`);
    }
  }

  console.log('\n📊 Validation Results:');
  console.log(`  ✅ Valid: ${validCount} files`);
  console.log(`  ❌ Invalid: ${invalidCount} files`);

  return invalidCount === 0;
}

function createRollbackScript() {
  console.log('🔙 Creating rollback script...');

  const rollbackContent = `#!/usr/bin/env node

/**
 * Rollback script for constructor pattern migration
 * Run this if the migration caused issues
 */

const fs = require('node:fs');
const path = require('node:path');

const COMMANDS_DIR = path.join(__dirname, '..', 'osric', 'commands');
const COMMAND_FILES = [
  ${COMMAND_FILES.map((file) => `'${file}'`).join(',\\n  ')}
];

console.log('🔙 Rolling back constructor pattern migration...');

let restoredCount = 0;

for (const commandFile of COMMAND_FILES) {
  const filePath = path.join(COMMANDS_DIR, commandFile);
  const backupPath = filePath + '.backup';
  
  if (fs.existsSync(backupPath)) {
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(filePath, backupContent);
    fs.unlinkSync(backupPath); // Remove backup after restore
    console.log(\`  ✅ Restored: \${commandFile}\`);
    restoredCount++;
  }
}

console.log(\`\\n🎉 Rollback completed! Restored \${restoredCount} files\`);
`;

  fs.writeFileSync(path.join(__dirname, '05-rollback-constructors.js'), rollbackContent);
  console.log('✅ Created rollback script: 05-rollback-constructors.js');
}

// Main execution
try {
  const patterns = analyzeConstructorPatterns();

  console.log('\\n📊 Analysis complete:', {
    totalPatterns: patterns.length,
    uniquePatterns: new Set(patterns.map((p) => p.type)).size,
  });

  console.log('\\n🚀 Starting constructor migration...');
  const results = migrateAllCommands();

  console.log('\\n🔍 Validating results...');
  const isValid = validateMigration();

  createRollbackScript();

  if (isValid && results.errorCount === 0) {
    console.log('\\n🎉 Script 05 completed successfully!');
    console.log('✅ All command constructors now use standardized pattern');
    console.log('📋 Next step: Run script 06-add-validation-system.js');
  } else {
    console.log('\\n⚠️  Migration completed with issues');
    console.log('🔙 Run 05-rollback-constructors.js to revert changes if needed');
    console.log('🔧 Manual fixes may be required for some files');
  }
} catch (error) {
  console.error('❌ Script failed:', error.message);
  console.log('🔙 Run 05-rollback-constructors.js to revert any changes');
  process.exit(1);
}
