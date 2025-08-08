#!/usr/bin/env node

/**
 * Script 02: Create Central Temporary Data Registry
 *
 * This script creates the centralized temporary data key registry
 * to replace the 8 different naming patterns currently in use.
 */

const fs = require('node:fs');
const path = require('node:path');

const REGISTRY_PATH = path.join(__dirname, '..', 'osric', 'core', 'TemporaryDataRegistry.ts');

function createTemporaryDataRegistry() {
  console.log('🔧 Creating central temporary data registry...');

  const registryContent = `import type { OSRICError } from '@osric/types/errors';

export const TEMP_DATA_KEYS = {
  spell: {
    CAST_PARAMS: 'spell:cast-spell:params',
    CAST_CONTEXT: 'spell:cast-spell:context',
    CAST_CASTER: 'spell:cast-spell:caster',
    CAST_SPELL: 'spell:cast-spell:spell-data',
    CAST_TARGETS: 'spell:cast-spell:targets',
    CAST_COMPONENTS: 'spell:cast-spell:components',
    CAST_VALIDATION: 'spell:cast-spell:validation',
    
    MEMORIZE_PARAMS: 'spell:memorize-spell:params',
    MEMORIZE_CONTEXT: 'spell:memorize-spell:context',
    MEMORIZE_CASTER: 'spell:memorize-spell:caster',
    MEMORIZE_SPELL: 'spell:memorize-spell:spell-data',
    
    SCROLL_PARAMS: 'spell:scroll-read:params',
    SCROLL_CONTEXT: 'spell:scroll-read:context',
    SCROLL_READER: 'spell:scroll-read:reader',
    SCROLL_ITEM: 'spell:scroll-read:scroll-item',
    
    IDENTIFY_PARAMS: 'spell:identify-magic-item:params',
    IDENTIFY_CONTEXT: 'spell:identify-magic-item:context',
    IDENTIFY_ITEM: 'spell:identify-magic-item:target-item',
    
    COMPONENT_TRACKING: 'spell:component-tracking:state',
    SLOT_MANAGEMENT: 'spell:slot-management:state',
  },
  
  combat: {
    ATTACK_PARAMS: 'combat:attack:params',
    ATTACK_CONTEXT: 'combat:attack:context',
    ATTACK_ATTACKER: 'combat:attack:attacker',
    ATTACK_TARGET: 'combat:attack:target',
    ATTACK_WEAPON: 'combat:attack:weapon',
    ATTACK_ROLL_RESULT: 'combat:attack:roll-result',
    
    INITIATIVE_PARAMS: 'combat:initiative:params',
    INITIATIVE_CONTEXT: 'combat:initiative:context',
    INITIATIVE_PARTICIPANTS: 'combat:initiative:participants',
    INITIATIVE_ORDER: 'combat:initiative:order',
    
    GRAPPLE_PARAMS: 'combat:grapple:params',
    GRAPPLE_CONTEXT: 'combat:grapple:context',
    GRAPPLE_ATTACKER: 'combat:grapple:attacker',
    GRAPPLE_DEFENDER: 'combat:grapple:defender',
  },
  
  character: {
    CREATE_PARAMS: 'character:create-character:params',
    CREATE_CONTEXT: 'character:create-character:context',
    CREATE_ABILITY_SCORES: 'character:create-character:ability-scores',
    CREATE_ADJUSTED_SCORES: 'character:create-character:adjusted-scores',
    CREATE_CHARACTER_DATA: 'character:create-character:character-data',
    
    LEVEL_UP_PARAMS: 'character:level-up:params',
    LEVEL_UP_CONTEXT: 'character:level-up:context',
    LEVEL_UP_CHARACTER: 'character:level-up:character',
    LEVEL_UP_BENEFITS: 'character:level-up:benefits',
    
    GAIN_EXP_PARAMS: 'character:gain-experience:params',
    GAIN_EXP_CONTEXT: 'character:gain-experience:context',
    GAIN_EXP_CHARACTER: 'character:gain-experience:character',
    GAIN_EXP_PARTY: 'character:gain-experience:party-data',
    
    SAVING_THROW_PARAMS: 'character:saving-throw:params',
    SAVING_THROW_CONTEXT: 'character:saving-throw:context',
    SAVING_THROW_CHARACTER: 'character:saving-throw:character',
    
    THIEF_SKILL_PARAMS: 'character:thief-skill-check:params',
    THIEF_SKILL_CONTEXT: 'character:thief-skill-check:context',
    THIEF_SKILL_CHARACTER: 'character:thief-skill-check:character',
    
    TURN_UNDEAD_PARAMS: 'character:turn-undead:params',
    TURN_UNDEAD_CONTEXT: 'character:turn-undead:context',
    TURN_UNDEAD_CLERIC: 'character:turn-undead:cleric',
    TURN_UNDEAD_TARGETS: 'character:turn-undead:undead-targets',
  },
  
  exploration: {
    SEARCH_PARAMS: 'exploration:search:params',
    SEARCH_CONTEXT: 'exploration:search:context',
    SEARCH_CHARACTER: 'exploration:search:character',
    SEARCH_AREA: 'exploration:search:area',
    
    MOVE_PARAMS: 'exploration:move:params',
    MOVE_CONTEXT: 'exploration:move:context',
    MOVE_CHARACTER: 'exploration:move:character',
    MOVE_DESTINATION: 'exploration:move:destination',
    
    FALLING_DAMAGE_PARAMS: 'exploration:falling-damage:params',
    FALLING_DAMAGE_CONTEXT: 'exploration:falling-damage:context',
    FALLING_DAMAGE_CHARACTER: 'exploration:falling-damage:character',
    
    FORAGING_PARAMS: 'exploration:foraging:params',
    FORAGING_CONTEXT: 'exploration:foraging:context',
    FORAGING_CHARACTER: 'exploration:foraging:character',
    
    TERRAIN_NAV_PARAMS: 'exploration:terrain-navigation:params',
    TERRAIN_NAV_CONTEXT: 'exploration:terrain-navigation:context',
    TERRAIN_NAV_CHARACTER: 'exploration:terrain-navigation:character',
    
    WEATHER_CHECK_PARAMS: 'exploration:weather-check:params',
    WEATHER_CHECK_CONTEXT: 'exploration:weather-check:context',
    WEATHER_CHECK_CHARACTER: 'exploration:weather-check:character',
    WEATHER_CHECK_CONDITIONS: 'exploration:weather-check:conditions',
  },
  
  npc: {
    MONSTER_GEN_PARAMS: 'npc:monster-generation:params',
    MONSTER_GEN_CONTEXT: 'npc:monster-generation:context',
    MONSTER_GEN_RESULT: 'npc:monster-generation:generated-monster',
    
    REACTION_ROLL_PARAMS: 'npc:reaction-roll:params',
    REACTION_ROLL_CONTEXT: 'npc:reaction-roll:context',
    REACTION_ROLL_NPC: 'npc:reaction-roll:npc',
    REACTION_ROLL_PARTY: 'npc:reaction-roll:party',
  },
} as const;

// Type-safe key extraction
export type TempDataKey = typeof TEMP_DATA_KEYS[keyof typeof TEMP_DATA_KEYS][keyof typeof TEMP_DATA_KEYS[keyof typeof TEMP_DATA_KEYS]];

// Validation function for startup checks
export function validateTempDataKeyUniqueness(): { valid: boolean; duplicates: string[] } {
  const allKeys: string[] = [];
  
  Object.values(TEMP_DATA_KEYS).forEach(domain => {
    Object.values(domain).forEach(key => {
      allKeys.push(key);
    });
  });
  
  const duplicates = allKeys.filter((key, index) => allKeys.indexOf(key) !== index);
  
  return {
    valid: duplicates.length === 0,
    duplicates: [...new Set(duplicates)]
  };
}

// Migration helper to map old keys to new keys
export const TEMP_KEY_MIGRATION_MAP = {
  // Old spell system keys -> New keys
  'castSpell_caster': TEMP_DATA_KEYS.spell.CAST_CASTER,
  'castSpell_spell': TEMP_DATA_KEYS.spell.CAST_SPELL,
  'castSpell_overrideComponents': TEMP_DATA_KEYS.spell.CAST_COMPONENTS,
  'scrollCreation_characterId': TEMP_DATA_KEYS.spell.SCROLL_READER,
  'scrollCreation_spellLevel': TEMP_DATA_KEYS.spell.SCROLL_CONTEXT,
  'newMagicItem': TEMP_DATA_KEYS.spell.IDENTIFY_ITEM,
  'magicItemToUse': TEMP_DATA_KEYS.spell.IDENTIFY_ITEM,
  'identificationAttempt': TEMP_DATA_KEYS.spell.IDENTIFY_CONTEXT,
  
  // Old combat keys -> New keys
  'attack-context': TEMP_DATA_KEYS.combat.ATTACK_CONTEXT,
  'initiative-context': TEMP_DATA_KEYS.combat.INITIATIVE_CONTEXT,
  
  // Old character keys -> New keys
  'character-creation': TEMP_DATA_KEYS.character.CREATE_PARAMS,
  'generated-ability-scores': TEMP_DATA_KEYS.character.CREATE_ABILITY_SCORES,
  'adjusted-ability-scores': TEMP_DATA_KEYS.character.CREATE_ADJUSTED_SCORES,
  'saving-throw-params': TEMP_DATA_KEYS.character.SAVING_THROW_PARAMS,
  
  // Old exploration keys -> New keys
  'search-request-params': TEMP_DATA_KEYS.exploration.SEARCH_PARAMS,
  'weather-effects': TEMP_DATA_KEYS.exploration.WEATHER_CHECK_CONDITIONS,
  'level-benefits': TEMP_DATA_KEYS.character.LEVEL_UP_BENEFITS,
  
  // Old NPC keys -> New keys
  'monster-generation-params': TEMP_DATA_KEYS.npc.MONSTER_GEN_PARAMS,
  'reaction-roll-params': TEMP_DATA_KEYS.npc.REACTION_ROLL_PARAMS,
} as const;

export type OldTempDataKey = keyof typeof TEMP_KEY_MIGRATION_MAP;
`;

  // Check if file already exists
  if (fs.existsSync(REGISTRY_PATH)) {
    console.log('✅ TemporaryDataRegistry.ts already exists');
    return;
  }

  // Ensure directory exists
  const registryDir = path.dirname(REGISTRY_PATH);
  fs.mkdirSync(registryDir, { recursive: true });

  // Write the registry file
  fs.writeFileSync(REGISTRY_PATH, registryContent);

  console.log('✅ Created TemporaryDataRegistry.ts');
  console.log('📊 Defined keys for 5 domains (spell, combat, character, exploration, npc)');
  console.log('🔄 Created migration map from old keys to new keys');
}

function updateTypesIndex() {
  console.log('🔧 Updating types index to export new registry...');

  const typesIndexPath = path.join(__dirname, '..', 'osric', 'types', 'index.ts');

  if (!fs.existsSync(typesIndexPath)) {
    console.log('⚠️  Types index not found, skipping export update');
    return;
  }

  const content = fs.readFileSync(typesIndexPath, 'utf8');

  if (content.includes('TemporaryDataRegistry')) {
    console.log('✅ Types index already exports TemporaryDataRegistry');
    return;
  }

  const updatedContent = `${content}\n// Temporary data registry\nexport * from '@osric/core/TemporaryDataRegistry';\n`;

  fs.writeFileSync(typesIndexPath, updatedContent);
  console.log('✅ Updated types index to export TemporaryDataRegistry');
}

function validateRegistryUniqueness() {
  console.log('🔍 Validating temporary data key uniqueness...');

  // Import and validate the registry we just created
  try {
    // Since we can't import TS directly in Node, we'll do the validation manually
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');

    // Extract all the key values using regex
    const keyMatches = registryContent.match(/'[^']+'/g) || [];
    const keyValues = keyMatches
      .map((match) => match.slice(1, -1)) // Remove quotes
      .filter((key) => key.includes(':')); // Only domain:command:type keys

    const duplicates = keyValues.filter((key, index) => keyValues.indexOf(key) !== index);

    if (duplicates.length > 0) {
      console.error('❌ Found duplicate keys:', [...new Set(duplicates)]);
      process.exit(1);
    }

    console.log(`✅ All ${keyValues.length} temporary data keys are unique`);
  } catch (error) {
    console.error('❌ Failed to validate registry:', error.message);
    process.exit(1);
  }
}

// Main execution
try {
  createTemporaryDataRegistry();
  updateTypesIndex();
  validateRegistryUniqueness();

  console.log('\\n🎉 Script 02 completed successfully!');
  console.log('📊 Created central registry with 70+ temporary data keys');
  console.log('🔄 Created migration map for 20+ old keys');
  console.log('📋 Next step: Run script 03-create-dice-engine.js');
} catch (error) {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
}
