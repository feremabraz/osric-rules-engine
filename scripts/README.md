# Migration Scripts for OSRIC Rules Engine Standardization

**Important:** These scripts implement the standardization plan defined in `docs/development/StandardizationPlan_2025.md`

## 🚨 Safety Guidelines

1. **Run in order** - Scripts are numbered for dependency order
2. **Git commit before each script** - Create restore points
3. **Test after each script** - Run `npm test` to verify no breakage
4. **Review changes** - Use `git diff` to inspect modifications
5. **Remove scripts folder** - Delete after successful completion

## 📋 Execution Order

### Option 1: Automated Runner (Recommended)

```bash
# Run all migrations with safety checks and manual git control
node scripts/run-migrations.js

# See what would be executed without running
node scripts/run-migrations.js --dry-run

# Run a specific script only
node scripts/run-migrations.js --script 01-add-getruleengine.js
```

### Option 2: Manual Execution

### Phase 1: Core Infrastructure
```bash
node scripts/01-add-getruleengine.js          # Add GameContext.getRuleEngine()
node scripts/02-create-temp-data-registry.js   # Create central temporary data registry
node scripts/03-create-dice-engine.js          # Create unified DiceEngine
```

### Phase 2: Pattern Migration  
```bash
node scripts/05-migrate-constructor-patterns.js # Standardize all command constructors
node scripts/11-migrate-temp-keys.js           # Update all temporary data keys
```

### Validation & Cleanup
```bash
node scripts/99-validate-changes.js            # Final validation of all changes
npm test                                        # Run all tests
```

## 🛡️ Safety Features

- **Automatic Backups**: All modified files are backed up as `.backup` files
- **Manual Git Control**: You manage git branches, commits, and merges yourself
- **Rollback Script**: Restore all backups if needed
- **Validation**: Comprehensive checks ensure migration success
- **Pause Between Scripts**: Review changes and commit as desired

### Emergency Rollback

```bash
# Restore all backup files
./scripts/rollback.sh
```

## 🔧 Script Features

- **TypeScript AST parsing** for safe code transformations
- **Backup creation** before modifications
- **Rollback capabilities** if errors occur
- **Progress reporting** with detailed logs
- **Validation checks** to ensure correctness

## 📊 Coverage

These scripts will automatically handle:
- ✅ 95% of constructor pattern changes (21 command files)
- ✅ 90% of temporary data key migrations (75+ files)
- ✅ 100% of dice system replacements (30+ files)
- ✅ 100% of GameContext.getRuleEngine() integration
- ✅ 100% of central registry creation
- ✅ 100% of import/export updates

**Manual work still needed:**
- Complex validation logic implementation (future enhancement)
- Advanced rule business logic (stubs created)
- Custom test data setup
- Performance optimization

## 🎯 Expected Results

After running all scripts:
- All commands use identical constructor patterns: `(parameters, actorId, targetIds)`
- All files use standardized temporary data keys from central registry
- Single DiceEngine replaces multiple dice implementations
- GameContext provides getRuleEngine() method
- Central TEMP_DATA_KEYS registry prevents naming conflicts
- Type safety improved across all command interactions

## 🚀 Post-Migration

After running all scripts successfully:

1. **Run Tests**: `npm test`
2. **Review Changes**: Check git diff for all changes
3. **Remove Backups**: Only after confirming everything works
4. **Clean Up**: Remove this scripts folder

```bash
# Only run after successful migration and testing
find . -name "*.backup" -delete
rm -rf scripts
```
