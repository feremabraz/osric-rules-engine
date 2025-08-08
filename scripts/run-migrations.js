#!/usr/bin/env node

/**
 * Master Migration Runner
 *
 * This script runs all migration scripts in the correct order
 * with safety checks and git integration.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const SCRIPTS_DIR = __dirname;

// Define the execution order
const MIGRATION_ORDER = [
  '01-add-getruleengine.js',
  '02-create-temp-data-registry.js',
  '03-create-dice-engine.js',
  '05-migrate-constructor-patterns.js',
  '11-migrate-temp-keys.js',
  '99-validate-changes.js',
];

function checkGitStatus() {
  console.log('🔍 Checking git status...');

  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });

    if (status.trim()) {
      console.log('⚠️  Working directory has uncommitted changes:');
      console.log(status);
      console.log('💡 Commit or stash changes before running migrations');
      return false;
    }

    console.log('✅ Working directory is clean');
    return true;
  } catch (error) {
    console.log('❌ Git check failed:', error.message);
    return false;
  }
}

function createMigrationBranch() {
  console.log('🌿 Creating migration branch...');

  try {
    const branchName = `osric-standardization-${Date.now()}`;
    execSync(`git checkout -b ${branchName}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });

    console.log(`✅ Created branch: ${branchName}`);
    return branchName;
  } catch (error) {
    console.log('❌ Branch creation failed:', error.message);
    return null;
  }
}

function runScript(scriptName) {
  console.log(`\n🚀 Running ${scriptName}...`);
  console.log('='.repeat(50));

  const scriptPath = path.join(SCRIPTS_DIR, scriptName);

  if (!fs.existsSync(scriptPath)) {
    console.log(`❌ Script not found: ${scriptName}`);
    return false;
  }

  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log(`✅ ${scriptName} completed successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${scriptName} failed with exit code:`, error.status);
    return false;
  }
}

function commitChanges(scriptName) {
  console.log(`📝 Committing changes from ${scriptName}...`);

  try {
    execSync('git add .', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });

    const commitMessage = `feat: ${scriptName.replace('.js', '').replace(/\d+-/, '').replace(/-/g, ' ')}`;

    execSync(`git commit -m "${commitMessage}"`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });

    console.log(`✅ Committed: ${commitMessage}`);
    return true;
  } catch (error) {
    console.log('⚠️  No changes to commit or commit failed:', error.message);
    return false;
  }
}

function runTests() {
  console.log('\n🧪 Running tests...');

  try {
    execSync('npm test', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log('✅ All tests passed');
    return true;
  } catch (error) {
    console.log('❌ Tests failed', error.message);
    return false;
  }
}

function createSummary(results) {
  console.log('\n📊 Migration Summary');
  console.log('='.repeat(50));

  for (const [script, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${script}`);
  }

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n📈 Success Rate: ${successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log('🎉 All migrations completed successfully!');
  } else {
    console.log('⚠️  Some migrations failed. Check the output above.');
  }
}

// Interactive mode
function promptContinue(message) {
  const readline = require('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🚀 OSRIC Rules Engine Standardization');
  console.log('=====================================');
  console.log('');
  console.log('This will run all migration scripts to standardize the codebase.');
  console.log('The process includes:');
  console.log('- Creating a new git branch');
  console.log('- Running migrations in order');
  console.log('- Committing each phase');
  console.log('- Running final validation');
  console.log('');

  // Check if we should proceed
  const shouldProceed = await promptContinue('Do you want to continue?');
  if (!shouldProceed) {
    console.log('👋 Migration cancelled');
    process.exit(0);
  }

  // Pre-flight checks
  if (!checkGitStatus()) {
    process.exit(1);
  }

  const branchName = createMigrationBranch();
  if (!branchName) {
    process.exit(1);
  }

  // Run migrations
  const results = {};
  let allSucceeded = true;

  for (const scriptName of MIGRATION_ORDER) {
    const success = runScript(scriptName);
    results[scriptName] = success;

    if (!success) {
      allSucceeded = false;
      console.log(`\n❌ Migration failed at ${scriptName}`);

      const shouldContinue = await promptContinue(
        'Do you want to continue with remaining scripts?'
      );
      if (!shouldContinue) {
        break;
      }
    } else if (scriptName !== '99-validate-changes.js') {
      // Commit after each successful script (except validation)
      commitChanges(scriptName);
    }
  }

  // Final summary
  createSummary(results);

  if (allSucceeded) {
    console.log('\n🧪 Running final tests...');
    const testsPass = runTests();

    if (testsPass) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📋 Next steps:');
      console.log('  1. Review the changes');
      console.log('  2. Merge the migration branch');
      console.log('  3. Remove backup files');
      console.log('  4. Delete scripts folder');
    } else {
      console.log('\n⚠️  Migration completed but tests failed');
      console.log('📋 Review test failures before merging');
    }
  } else {
    console.log('\n❌ Migration incomplete');
    console.log('📋 Review failed scripts and re-run if needed');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
OSRIC Migration Runner

Usage:
  node run-migrations.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be done without executing
  --script NAME  Run only a specific script

Examples:
  node run-migrations.js
  node run-migrations.js --script 01-add-getruleengine.js
  node run-migrations.js --dry-run
`);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🔍 Dry run mode - showing what would be executed:');
  console.log('');
  console.log('Execution order:');
  for (let i = 0; i < MIGRATION_ORDER.length; i++) {
    console.log(`  ${i + 1}. ${MIGRATION_ORDER[i]}`);
  }
  console.log('');
  console.log('Use --script NAME to run a specific script');
  process.exit(0);
}

const scriptArg = args.find((arg) => arg === '--script');
if (scriptArg) {
  const scriptName = args[args.indexOf(scriptArg) + 1];
  if (!scriptName) {
    console.log('❌ --script requires a script name');
    process.exit(1);
  }

  if (!MIGRATION_ORDER.includes(scriptName)) {
    console.log(`❌ Unknown script: ${scriptName}`);
    console.log('Available scripts:', MIGRATION_ORDER.join(', '));
    process.exit(1);
  }

  console.log(`🚀 Running single script: ${scriptName}`);
  const success = runScript(scriptName);
  process.exit(success ? 0 : 1);
}

// Run main migration
main().catch((error) => {
  console.error('❌ Migration runner failed:', error);
  process.exit(1);
});
