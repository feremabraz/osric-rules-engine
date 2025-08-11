export const COMMAND_TYPES = {
  CREATE_CHARACTER: 'create-character',
  GAIN_EXPERIENCE: 'gain-experience',
  LEVEL_UP: 'level-up',
  MULTI_CLASS: 'multi-class',
  ASSIGN_ABILITY_SCORES: 'assign-ability-scores',

  ATTACK: 'attack',
  GRAPPLE: 'grapple',
  INITIATIVE: 'initiative',
  USE_SHIELD: 'use-shield',
  CHECK_TWO_WEAPON: 'check-two-weapon',
  CHECK_SPECIALIZATION: 'check-specialization',
  CHECK_WEAPON_TYPE: 'check-weapon-type',
  CHECK_ARMOR: 'check-armor',
  CHECK_MOUNTED_COMBAT: 'check-mounted-combat',
  DISMOUNT: 'dismount',
  MOUNTED_CHARGE: 'mounted-charge',
  MOUNTED_COMBAT: 'mounted-combat',
  AERIAL_COMBAT: 'aerial-combat',
  DIVE_ATTACK: 'dive-attack',
  AERIAL_MOVE: 'aerial-move',
  UNDERWATER_MOVE: 'underwater-move',

  CAST_SPELL: 'cast-spell',
  MEMORIZE_SPELL: 'memorize-spell',
  READ_SCROLL: 'read-scroll',
  IDENTIFY_MAGIC_ITEM: 'identify-magic-item',

  MOVE: 'move',
  SEARCH: 'search',
  SURVIVAL_CHECK: 'survival-check',
  ENVIRONMENTAL_HAZARD: 'environmental-hazard',

  REACTION_ROLL: 'reaction-roll',
  MORALE_CHECK: 'morale-check',
  LOYALTY_CHECK: 'loyalty-check',

  THIEF_SKILL_CHECK: 'thief-skill-check',

  SAVING_THROW: 'saving-throw',

  TURN_UNDEAD: 'turn-undead',

  FALLING_DAMAGE: 'falling-damage',
  DROWNING_CHECK: 'drowning-check',
  TEMPERATURE_CHECK: 'temperature-check',

  MONSTER_GENERATION: 'monster-generation',

  SPELL_RESEARCH: 'spell-research',
  MAGIC_ITEM_CREATION: 'magic-item-creation',

  WEATHER_CHECK: 'weather-check',
  TERRAIN_NAVIGATION: 'terrain-navigation',
  FORAGING: 'foraging',
} as const;

export const RULE_NAMES = {
  ABILITY_SCORE_GENERATION: 'ability-score-generation',
  ABILITY_SCORE_MODIFIERS: 'ability-score-modifiers',
  CHARACTER_INITIALIZATION: 'character-initialization',
  CLASS_REQUIREMENTS: 'class-requirements',
  RACIAL_RESTRICTIONS: 'racial-restrictions',
  RACIAL_ABILITIES: 'racial-abilities',
  MULTI_CLASS_VALIDATION: 'multi-class-validation',
  STARTING_EQUIPMENT: 'starting-equipment',
  SECONDARY_SKILLS: 'secondary-skills',
  LANGUAGES: 'languages',
  AGE_EFFECTS: 'age-effects',

  RANGE_CHECK: 'range-check',
  ATTACK_ROLL: 'attack-roll',
  DAMAGE_CALCULATION: 'damage-calculation',
  ARMOR_ABSORPTION: 'armor-absorption',
  WEAPON_SPECIALIZATION: 'weapon-specialization',
  TWO_WEAPON_FIGHTING: 'two-weapon-fighting',
  CRITICAL_HITS: 'critical-hits',
  MULTIPLE_ATTACKS: 'multiple-attacks',
  INITIATIVE_ROLL: 'initiative-roll',
  INITIATIVE_ORDER: 'initiative-order',
  GRAPPLING: 'grappling',
  GRAPPLE_ATTACK: 'grapple-attack',
  STRENGTH_COMPARISON: 'strength-comparison',
  GRAPPLE_EFFECT: 'grapple-effect',
  MOUNTED_COMBAT: 'mounted-combat',
  AERIAL_COMBAT: 'aerial-combat',
  UNDERWATER_COMBAT: 'underwater-combat',

  SPELL_CASTING: 'spell-casting',
  SPELL_MEMORIZATION: 'spell-memorization',
  SPELL_MEMORIZATION_VALIDATION: 'spell-memorization-validation',
  SPELL_SLOT_ALLOCATION: 'spell-slot-allocation',
  SPELL_PROGRESSION: 'spell-progression',
  COMPONENT_CHECK: 'component-check',
  COMPONENT_TRACKING: 'component-tracking',
  CASTING_TIME_VALIDATION: 'casting-time-validation',
  SPELL_INTERRUPTION: 'spell-interruption',
  SPELL_EFFECTS: 'spell-effects',
  SPELL_EFFECT_RESOLUTION: 'spell-effect-resolution',
  SAVING_THROWS: 'saving-throws',
  SAVING_THROW_CALCULATION: 'saving-throw-calculation',
  SPELL_RESISTANCE: 'spell-resistance',
  AREA_OF_EFFECT: 'area-of-effect',
  SPELL_DURATION: 'spell-duration',
  SPELL_RANGE: 'spell-range',
  MAGIC_ITEM_RULES: 'magic-item-rules',
  SCROLL_CREATION: 'scroll-creation',
  SPELL_RESEARCH: 'spell-research',
  ADVANCED_SPELL_RULES: 'advanced-spell-rules',
  SCROLL_CREATION_REQUIREMENTS: 'scroll-creation-requirements',
  SCROLL_CREATION_START: 'scroll-creation-start',
  SCROLL_CREATION_PROGRESS: 'scroll-creation-progress',
  SCROLL_USAGE_VALIDATION: 'scroll-usage-validation',
  SCROLL_VALIDATION: 'scroll-validation',
  SCROLL_READING_CHANCE: 'scroll-reading-chance',
  SCROLL_CASTING_FAILURE: 'scroll-casting-failure',
  SCROLL_SPELL_CASTING: 'scroll-spell-casting',
  IDENTIFICATION_VALIDATION: 'identification-validation',
  IDENTIFICATION_METHOD: 'identification-method',
  IDENTIFICATION_RESULTS: 'identification-results',

  EXPERIENCE_GAIN: 'experience-gain',
  LEVEL_PROGRESSION: 'level-progression',
  TRAINING_REQUIREMENTS: 'training-requirements',

  MOVEMENT_VALIDATION: 'movement-validation',
  SEARCH_MECHANICS: 'search-mechanics',

  THIEF_SKILLS: 'thief-skills',
  TURN_UNDEAD: 'turn-undead',
  OPEN_DOORS: 'open-doors',
  BEND_BARS: 'bend-bars',
  SURPRISE_CHECK: 'surprise-check',
  MORALE_CHECK: 'morale-check',
  REACTION_ROLL: 'reaction-roll',
  LOYALTY_CHECK: 'loyalty-check',

  FALLING_DAMAGE: 'falling-damage',
  DROWNING: 'drowning',
  SUFFOCATION: 'suffocation',
  TEMPERATURE_EFFECTS: 'temperature-effects',
  SURVIVAL_CHECKS: 'survival-checks',
  MOVEMENT_RATES: 'movement-rates',
  ENCUMBRANCE: 'encumbrance',
  LIGHTING_EFFECTS: 'lighting-effects',

  MONSTER_BEHAVIOR: 'monster-behavior',
  SPECIAL_ABILITIES: 'special-abilities',
  TREASURE_GENERATION: 'treasure-generation',

  ENCHANTMENT_RULES: 'enchantment-rules',
  SCROLL_SCRIBING: 'scroll-scribing',

  WEATHER_EFFECTS: 'weather-effects',
  TERRAIN_NAVIGATION: 'terrain-navigation',
  VISIBILITY_RULES: 'visibility-rules',
  FORAGING_RULES: 'foraging-rules',

  SCROLL_SCRIBING_RULES: 'scroll-scribing-rules',
  HIT_POINT_ADVANCEMENT: 'hit-point-advancement',
} as const;

export const ERROR_TYPES = {
  'invalid-parameter': 'invalid-parameter',
  'missing-parameter': 'missing-parameter',
  'invalid-state': 'invalid-state',
  'validation-failed': 'validation-failed',

  'entity-not-found': 'entity-not-found',
  'entity-exists': 'entity-exists',
  'entity-invalid': 'entity-invalid',

  'command-not-found': 'command-not-found',
  'command-cannot-execute': 'command-cannot-execute',
  'command-failed': 'command-failed',

  'rule-not-found': 'rule-not-found',
  'rule-validation-failed': 'rule-validation-failed',
  'rule-failed': 'rule-failed',

  'osric-violation': 'osric-violation',
  'stat-out-of-range': 'stat-out-of-range',
  'class-requirement-not-met': 'class-requirement-not-met',

  'attack-failed': 'attack-failed',
  'weapon-not-available': 'weapon-not-available',
  'target-invalid': 'target-invalid',

  'spell-failure': 'spell-failure',
  'component-missing': 'component-missing',
  'spell-slot-unavailable': 'spell-slot-unavailable',
  'spell-not-memorized': 'spell-not-memorized',

  'internal-error': 'internal-error',
  'unknown-error': 'unknown-error',
  'not-implemented': 'not-implemented',
  'multiple-errors': 'multiple-errors',
} as const;

export const IMPORT_PATHS = {
  COMMAND: '@osric/core/Command',
  RULE: '@osric/core/Rule',
  GAME_CONTEXT: '@osric/core/GameContext',
  DICE: '@osric/core/Dice',
  RULE_CHAIN: '@osric/core/RuleChain',
  RULE_ENGINE: '@osric/core/RuleEngine',

  ENTITIES: '@osric/types',
  COMMANDS: '@osric/types/commands',
  RULES: '@osric/types/rules',
  ERRORS: '@osric/types/errors',
  CONSTANTS: '@osric/types/constants',
  SPELL_TYPES: '@osric/types/spell-types',

  CHARACTER: '@osric/entities/Character',
  MONSTER: '@osric/entities/Monster',
  ITEM: '@osric/entities/Item',
  SPELL: '@osric/entities/Spell',
} as const;

export type CommandType = (typeof COMMAND_TYPES)[keyof typeof COMMAND_TYPES];
export type RuleName = (typeof RULE_NAMES)[keyof typeof RULE_NAMES];
export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];
export type ImportPath = (typeof IMPORT_PATHS)[keyof typeof IMPORT_PATHS];

export function isValidCommandType(type: string): type is CommandType {
  return Object.values(COMMAND_TYPES).includes(type as CommandType);
}

export function isValidRuleName(name: string): name is RuleName {
  return Object.values(RULE_NAMES).includes(name as RuleName);
}

export function isValidErrorType(type: string): type is ErrorType {
  return Object.values(ERROR_TYPES).includes(type as ErrorType);
}

export function getCommandTypeByValue(value: string): CommandType | null {
  const entry = Object.entries(COMMAND_TYPES).find(([, v]) => v === value);
  return entry ? entry[1] : null;
}

export function getRuleNameByValue(value: string): RuleName | null {
  const entry = Object.entries(RULE_NAMES).find(([, v]) => v === value);
  return entry ? entry[1] : null;
}

export function getErrorTypeByValue(value: string): ErrorType | null {
  const entry = Object.entries(ERROR_TYPES).find(([, v]) => v === value);
  return entry ? entry[1] : null;
}
