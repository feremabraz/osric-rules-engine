#!/bin/bash

# Rollback script for OSRIC standardization migrations
# This script restores all backup files created during migration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 OSRIC Migration Rollback"
echo "=========================="
echo

# Check if we're in git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Find all backup files
echo "🔍 Finding backup files..."
BACKUP_FILES=$(find "$PROJECT_ROOT" -name "*.backup" -type f)

if [ -z "$BACKUP_FILES" ]; then
    echo "ℹ️  No backup files found"
    echo "Migration may not have been run or backups were already cleaned up"
    exit 0
fi

echo "📋 Found backup files:"
echo "$BACKUP_FILES"
echo

# Ask for confirmation
read -p "🤔 Do you want to restore all backup files? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "👋 Rollback cancelled"
    exit 0
fi

# Restore backup files
echo "🔄 Restoring backup files..."
RESTORED_COUNT=0

while IFS= read -r backup_file; do
    if [ -f "$backup_file" ]; then
        # Get original file path (remove .backup extension)
        original_file="${backup_file%.backup}"
        
        echo "  📁 Restoring: $(basename "$original_file")"
        
        # Restore the backup
        cp "$backup_file" "$original_file"
        
        # Remove the backup file
        rm "$backup_file"
        
        RESTORED_COUNT=$((RESTORED_COUNT + 1))
    fi
done <<< "$BACKUP_FILES"

echo
echo "✅ Restored $RESTORED_COUNT files"

# Check git status
if git diff --quiet; then
    echo "ℹ️  No changes detected in git"
else
    echo "📝 Git status after rollback:"
    git status --short
    echo
    echo "💡 You may want to commit these changes or reset to HEAD"
fi

echo
echo "🎉 Rollback completed successfully!"
echo "📋 Next steps:"
echo "  1. Review the restored files"
echo "  2. Run tests to ensure everything works"
echo "  3. Commit changes if satisfied"
