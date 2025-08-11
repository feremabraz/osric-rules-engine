import type { SavingThrowParams } from '@osric/types/commands';
import { SAVING_THROW_TYPES } from '@osric/types/commands';
// Type-only imports from command modules to avoid runtime cycles
import type { AttackParameters } from '../commands/combat/AttackCommand';
import type { ForagingParameters } from '../commands/exploration/ForagingCommand';
import type { MoveParameters } from '../commands/exploration/MoveCommand';
import type { SearchParameters } from '../commands/exploration/SearchCommand';
import type { NavigationParameters } from '../commands/exploration/TerrainNavigationCommand';
import type { WeatherCheckParameters } from '../commands/exploration/WeatherCheckCommand';
import type { Validator } from './ValidationEngine';
import { OSRICValidation, ValidationEngine } from './ValidationEngine';

// Helper: typed membership check for string unions
function isStringOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

// Centralized validators for command parameters
export const SavingThrowValidator: Validator<SavingThrowParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('saveType'),
    ValidationEngine.pattern(
      'saveType',
      new RegExp(`^(${SAVING_THROW_TYPES.join('|')})$`),
      'Invalid saving throw type'
    ),
    {
      field: 'situationalModifiers.magicItemBonus',
      message: 'situationalModifiers.magicItemBonus must be a number',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'targetNumber',
      message: 'targetNumber must be between 2 and 20 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 2 && value <= 20);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Attack command validator
const ATTACK_TYPES = ['normal', 'subdual', 'grapple'] as const;
export const AttackValidator: Validator<AttackParameters> = {
  rules: [
    ValidationEngine.required('attackerId'),
    ValidationEngine.required('targetId'),
    // Optional fields type checks
    {
      field: 'situationalModifiers',
      message: 'situationalModifiers must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'attackType',
      message: `attackType must be one of: ${ATTACK_TYPES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ATTACK_TYPES);
      },
    },
    {
      field: 'isChargedAttack',
      message: 'isChargedAttack must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Search command validator
const SEARCH_TYPES = ['secret-doors', 'traps', 'hidden-objects', 'general'] as const;
const THOROUGHNESS = ['quick', 'normal', 'careful', 'meticulous'] as const;
export const SearchValidator: Validator<SearchParameters> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('searchType'),
    {
      field: 'searchType',
      message: `searchType must be one of: ${SEARCH_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, SEARCH_TYPES);
      },
    },
    ValidationEngine.required('timeSpent'),
    ValidationEngine.nonNegativeInteger('timeSpent'),
    ValidationEngine.required('thoroughness'),
    {
      field: 'thoroughness',
      message: `thoroughness must be one of: ${THOROUGHNESS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, THOROUGHNESS);
      },
    },
    {
      field: 'target.area',
      message: 'target.area must be a non-empty string when provided',
      validate(value) {
        return value == null || (typeof value === 'string' && value.length > 0);
      },
    },
    {
      field: 'target.specificTarget',
      message: 'target.specificTarget must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Weather check command validator
const WEATHER_TYPES = [
  'clear',
  'overcast',
  'light-rain',
  'heavy-rain',
  'drizzle',
  'fog',
  'light-snow',
  'heavy-snow',
  'blizzard',
  'wind',
  'storm',
] as const;
const INTENSITY = ['light', 'moderate', 'heavy', 'severe'] as const;
const TEMPERATURE = ['freezing', 'cold', 'cool', 'mild', 'warm', 'hot', 'scorching'] as const;
const ACTIVITY_TYPES = [
  'travel',
  'combat',
  'spellcasting',
  'ranged-attack',
  'rest',
  'foraging',
] as const;
export const WeatherCheckValidator: Validator<WeatherCheckParameters> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('currentWeather.type'),
    {
      field: 'currentWeather.type',
      message: `currentWeather.type must be one of: ${WEATHER_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, WEATHER_TYPES);
      },
    },
    ValidationEngine.required('currentWeather.intensity'),
    {
      field: 'currentWeather.intensity',
      message: `currentWeather.intensity must be one of: ${INTENSITY.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INTENSITY);
      },
    },
    ValidationEngine.required('currentWeather.duration'),
    ValidationEngine.nonNegativeInteger('currentWeather.duration'),
    ValidationEngine.required('currentWeather.temperature'),
    {
      field: 'currentWeather.temperature',
      message: `currentWeather.temperature must be one of: ${TEMPERATURE.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TEMPERATURE);
      },
    },
    ValidationEngine.required('activityType'),
    {
      field: 'activityType',
      message: `activityType must be one of: ${ACTIVITY_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, ACTIVITY_TYPES);
      },
    },
    {
      field: 'exposureTime',
      message: 'exposureTime must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) >= 0);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Move command validator
const MOVE_TYPES = ['walk', 'run', 'sneak', 'fly', 'swim', 'climb'] as const;
const TERRAIN_TYPES_SIMPLE = ['Normal', 'Difficult', 'Very Difficult', 'Impassable'] as const;
const TIME_SCALES = ['combat', 'exploration', 'overland'] as const;
export const MoveValidator: Validator<MoveParameters> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('movement.type'),
    {
      field: 'movement.type',
      message: `movement.type must be one of: ${MOVE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, MOVE_TYPES);
      },
    },
    ValidationEngine.required('movement.distance'),
    ValidationEngine.nonNegativeInteger('movement.distance'),
    {
      field: 'movement.direction',
      message: 'movement.direction must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    {
      field: 'movement.destination',
      message: 'movement.destination must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    ValidationEngine.required('terrain.type'),
    {
      field: 'terrain.type',
      message: `terrain.type must be one of: ${TERRAIN_TYPES_SIMPLE.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TERRAIN_TYPES_SIMPLE);
      },
    },
    ValidationEngine.required('terrain.environment'),
    {
      field: 'terrain.environmentalFeature',
      message: 'terrain.environmentalFeature must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    ValidationEngine.required('timeScale'),
    {
      field: 'timeScale',
      message: `timeScale must be one of: ${TIME_SCALES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TIME_SCALES);
      },
    },
    {
      field: 'forcedMarch',
      message: 'forcedMarch must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Foraging command validator
const FORAGE_TYPES = ['food', 'water', 'both'] as const;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const ForagingValidator: Validator<ForagingParameters> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('forageType'),
    {
      field: 'forageType',
      message: `forageType must be one of: ${FORAGE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, FORAGE_TYPES);
      },
    },
    ValidationEngine.required('terrain'),
    ValidationEngine.required('season'),
    {
      field: 'season',
      message: `season must be one of: ${SEASONS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, SEASONS);
      },
    },
    ValidationEngine.required('timeSpent'),
    ValidationEngine.nonNegativeInteger('timeSpent'),
    ValidationEngine.required('groupSize'),
    ValidationEngine.nonNegativeInteger('groupSize'),
    ValidationEngine.required('hasForagingTools'),
    {
      field: 'hasForagingTools',
      message: 'hasForagingTools must be a boolean',
      validate(value) {
        return typeof value === 'boolean';
      },
    },
    {
      field: 'weatherConditions.type',
      message: 'weatherConditions.type must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    {
      field: 'weatherConditions.impactsForaging',
      message: 'weatherConditions.impactsForaging must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

// Terrain navigation validator
const NAV_METHODS = ['landmark', 'compass', 'stars', 'ranger-tracking', 'none'] as const;
const TIMES_OF_DAY = ['dawn', 'day', 'dusk', 'night'] as const;
export const TerrainNavigationValidator: Validator<NavigationParameters> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('terrainType.name'),
    ValidationEngine.required('terrainType.movementModifier'),
    {
      field: 'terrainType.movementModifier',
      message: 'terrainType.movementModifier must be a number between 0 and 2',
      validate(value) {
        return typeof value === 'number' && value >= 0 && value <= 2;
      },
    },
    ValidationEngine.required('terrainType.gettingLostChance'),
    {
      field: 'terrainType.gettingLostChance',
      message: 'terrainType.gettingLostChance must be between 0 and 100',
      validate(value) {
        return typeof value === 'number' && value >= 0 && value <= 100;
      },
    },
    ValidationEngine.required('terrainType.visibilityDistance'),
    ValidationEngine.nonNegativeInteger('terrainType.visibilityDistance'),
    ValidationEngine.required('distance'),
    ValidationEngine.nonNegativeInteger('distance'),
    ValidationEngine.required('navigationMethod'),
    {
      field: 'navigationMethod',
      message: `navigationMethod must be one of: ${NAV_METHODS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, NAV_METHODS);
      },
    },
    ValidationEngine.required('hasMap'),
    {
      field: 'hasMap',
      message: 'hasMap must be a boolean',
      validate(value) {
        return typeof value === 'boolean';
      },
    },
    ValidationEngine.required('timeOfDay'),
    {
      field: 'timeOfDay',
      message: `timeOfDay must be one of: ${TIMES_OF_DAY.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TIMES_OF_DAY);
      },
    },
    {
      field: 'weatherConditions.visibility',
      message: 'weatherConditions.visibility must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) >= 0);
      },
    },
    {
      field: 'weatherConditions.movementPenalty',
      message: 'weatherConditions.movementPenalty must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

export const Validators = {
  SavingThrowCommand: SavingThrowValidator,
  AttackCommand: AttackValidator,
  SearchCommand: SearchValidator,
  WeatherCheckCommand: WeatherCheckValidator,
  MoveCommand: MoveValidator,
  ForagingCommand: ForagingValidator,
  TerrainNavigationCommand: TerrainNavigationValidator,
};

export type ValidatorsMap = typeof Validators;

// --- Additional validators batch 2 ---
// Use plain object shapes to avoid cross-module coupling.
type AnyParams = Record<string, unknown>;

const INITIATIVE_TYPES = ['individual', 'group'] as const;
export const InitiativeValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('entities'),
    {
      field: 'entities',
      message: 'entities must be a non-empty array',
      validate(value) {
        return Array.isArray(value) && value.length > 0;
      },
    },
    ValidationEngine.required('initiativeType'),
    {
      field: 'initiativeType',
      message: `initiativeType must be one of: ${INITIATIVE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INITIATIVE_TYPES);
      },
    },
    {
      field: 'weapons',
      message: 'weapons must be a record of entityId -> itemId when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
    {
      field: 'spells',
      message: 'spells must be a record of entityId -> spellName when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
    {
      field: 'circumstanceModifiers',
      message: 'circumstanceModifiers must be a record of entityId -> number when provided',
      validate(value) {
        return (
          value == null ||
          (typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.values(value as Record<string, unknown>).every((v) => typeof v === 'number'))
        );
      },
    },
    {
      field: 'isFirstRound',
      message: 'isFirstRound must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

const GRAPPLE_TYPES = ['standard', 'overbearing'] as const;
export const GrappleValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('attackerId'),
    ValidationEngine.required('targetId'),
    ValidationEngine.required('grappleType'),
    {
      field: 'grappleType',
      message: `grappleType must be one of: ${GRAPPLE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, GRAPPLE_TYPES);
      },
    },
    {
      field: 'isChargedAttack',
      message: 'isChargedAttack must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'situationalModifiers',
      message: 'situationalModifiers must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

export const CastSpellValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('casterId'),
    ValidationEngine.required('spellName'),
    {
      field: 'spellLevel',
      message: 'spellLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) > 0);
      },
    },
    {
      field: 'targetIds',
      message: 'targetIds must be an array of entity IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
      },
    },
    {
      field: 'overrideComponents',
      message: 'overrideComponents must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

export const MemorizeSpellValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('casterId'),
    ValidationEngine.required('spellName'),
    ValidationEngine.required('spellLevel'),
    ValidationEngine.positiveInteger('spellLevel'),
    {
      field: 'replaceSpell',
      message: 'replaceSpell must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

export const ScrollReadValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('readerId'),
    ValidationEngine.required('scrollId'),
    {
      field: 'targetIds',
      message: 'targetIds must be an array of entity IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

const IDENTIFY_METHODS = ['spell', 'sage', 'trial'] as const;
export const IdentifyMagicItemValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('identifierId'),
    ValidationEngine.required('itemId'),
    ValidationEngine.required('method'),
    {
      field: 'method',
      message: `method must be one of: ${IDENTIFY_METHODS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, IDENTIFY_METHODS);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// --- Additional validators batch 3 ---

// CreateCharacter
export const CreateCharacterValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('name'),
    ValidationEngine.stringLength('name', 1, 50),
    OSRICValidation.characterRace('race'),
    OSRICValidation.characterClass('characterClass'),
    OSRICValidation.alignment('alignment'),
    ValidationEngine.oneOf('abilityScoreMethod', ['standard3d6', 'arranged3d6', '4d6dropLowest']),
    ValidationEngine.custom<unknown>(
      'arrangedScores',
      (value) => value == null || typeof value === 'object',
      'arrangedScores must be provided when using arranged3d6'
    ),
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// LevelUp
export const LevelUpValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    {
      field: 'targetLevel',
      message: 'targetLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) > 0);
      },
    },
    {
      field: 'bypassTraining',
      message: 'bypassTraining must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'trainerDetails',
      message: 'trainerDetails must be an object when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// ThiefSkillCheck
const THIEF_SKILLS = [
  'pick-locks',
  'find-traps',
  'move-silently',
  'hide-shadows',
  'hear-noise',
  'climb-walls',
  'read-languages',
] as const;
const DIFFICULTY = ['easy', 'normal', 'hard', 'very-hard'] as const;
const LIGHTING = ['bright', 'dim', 'dark', 'pitch-black'] as const;
const TIME_MODES = ['rushed', 'normal', 'careful'] as const;
const NOISE = ['silent', 'quiet', 'normal', 'loud'] as const;
const SURFACE = ['easy', 'normal', 'difficult', 'treacherous'] as const;
export const ThiefSkillCheckValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('skillType'),
    {
      field: 'skillType',
      message: `skillType must be one of: ${THIEF_SKILLS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, THIEF_SKILLS);
      },
    },
    {
      field: 'situationalModifiers.difficulty',
      message: `difficulty must be one of: ${DIFFICULTY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, DIFFICULTY);
      },
    },
    {
      field: 'situationalModifiers.equipment',
      message: 'equipment modifier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.lighting',
      message: `lighting must be one of: ${LIGHTING.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, LIGHTING);
      },
    },
    {
      field: 'situationalModifiers.time',
      message: `time must be one of: ${TIME_MODES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, TIME_MODES);
      },
    },
    {
      field: 'situationalModifiers.noise',
      message: `noise must be one of: ${NOISE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, NOISE);
      },
    },
    {
      field: 'situationalModifiers.surface',
      message: `surface must be one of: ${SURFACE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, SURFACE);
      },
    },
    {
      field: 'targetDifficulty',
      message: 'targetDifficulty must be between 1 and 99 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 1 && value <= 99);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// GainExperience
const XP_SOURCE_TYPES = ['combat', 'treasure', 'story', 'other'] as const;
export const GainExperienceValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('experienceSource.type'),
    {
      field: 'experienceSource.type',
      message: `experienceSource.type must be one of: ${XP_SOURCE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, XP_SOURCE_TYPES);
      },
    },
    {
      field: 'experienceSource.amount',
      message: 'experienceSource.amount must be a non-negative number when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0);
      },
    },
    {
      field: 'experienceSource.treasureValue',
      message: 'experienceSource.treasureValue must be a non-negative number when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0);
      },
    },
    {
      field: 'partyShare.enabled',
      message: 'partyShare.enabled must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'partyShare.partyMemberIds',
      message: 'partyShare.partyMemberIds must be an array of IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
      },
    },
    {
      field: 'partyShare.shareRatio',
      message: 'partyShare.shareRatio must be a number between 0 and 1 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0 && value <= 1);
      },
    },
    {
      field: 'applyClassModifiers',
      message: 'applyClassModifiers must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// FallingDamage
const SURFACE_TYPES = ['soft', 'normal', 'hard', 'spikes'] as const;
const ENCUMBRANCE = ['light', 'moderate', 'heavy', 'severe'] as const;
export const FallingDamageValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('fallDistance'),
    ValidationEngine.nonNegativeInteger('fallDistance'),
    {
      field: 'surfaceType',
      message: `surfaceType must be one of: ${SURFACE_TYPES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, SURFACE_TYPES);
      },
    },
    {
      field: 'circumstances.intentional',
      message: 'circumstances.intentional must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'circumstances.hasFeatherFall',
      message: 'circumstances.hasFeatherFall must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'circumstances.encumbrance',
      message: `circumstances.encumbrance must be one of: ${ENCUMBRANCE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ENCUMBRANCE);
      },
    },
    {
      field: 'circumstances.dexterityCheck',
      message: 'circumstances.dexterityCheck must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'savingThrow',
      message: 'savingThrow must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// MonsterGeneration
const MG_TERRAINS = [
  'dungeon',
  'forest',
  'plains',
  'hills',
  'mountains',
  'swamp',
  'desert',
  'arctic',
  'ocean',
  'city',
] as const;
const MG_TIMES = ['day', 'night', 'dawn', 'dusk'] as const;
const MG_WEATHER = ['clear', 'rain', 'storm', 'fog', 'snow'] as const;
export const MonsterGenerationValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('terrainType'),
    {
      field: 'terrainType',
      message: `terrainType must be one of: ${MG_TERRAINS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, MG_TERRAINS);
      },
    },
    ValidationEngine.required('encounterLevel'),
    {
      field: 'encounterLevel',
      message: 'encounterLevel must be between 1 and 20',
      validate(value) {
        return typeof value === 'number' && value >= 1 && value <= 20;
      },
    },
    ValidationEngine.required('partySize'),
    {
      field: 'partySize',
      message: 'partySize must be between 1 and 12',
      validate(value) {
        return typeof value === 'number' && value >= 1 && value <= 12;
      },
    },
    {
      field: 'timeOfDay',
      message: `timeOfDay must be one of: ${MG_TIMES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, MG_TIMES);
      },
    },
    {
      field: 'weather',
      message: `weather must be one of: ${MG_WEATHER.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, MG_WEATHER);
      },
    },
    {
      field: 'specialConditions',
      message: 'specialConditions must be an object when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// ReactionRoll
const INTERACTION_TYPES = [
  'first_meeting',
  'negotiation',
  'intimidation',
  'persuasion',
  'bribery',
] as const;
export const ReactionRollValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('targetId'),
    ValidationEngine.required('interactionType'),
    {
      field: 'interactionType',
      message: `interactionType must be one of: ${INTERACTION_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INTERACTION_TYPES);
      },
    },
    {
      field: 'modifiers.gifts',
      message: 'modifiers.gifts must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.threats',
      message: 'modifiers.threats must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.reputation',
      message: 'modifiers.reputation must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.languageBarrier',
      message: 'modifiers.languageBarrier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.culturalDifferences',
      message: 'modifiers.culturalDifferences must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.partySizeModifier',
      message: 'modifiers.partySizeModifier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'isPartySpokesperson',
      message: 'isPartySpokesperson must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// MagicItemCreation
const ITEM_TYPES = [
  'scroll',
  'potion',
  'weapon',
  'armor',
  'ring',
  'wand',
  'rod',
  'staff',
  'miscellaneous',
] as const;
const WORKSPACE_QUALITY = ['basic', 'good', 'excellent', 'legendary'] as const;
export const MagicItemCreationValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('itemType'),
    {
      field: 'itemType',
      message: `itemType must be one of: ${ITEM_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, ITEM_TYPES);
      },
    },
    {
      field: 'enchantmentLevel',
      message: 'enchantmentLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) > 0);
      },
    },
    {
      field: 'spellsToScribe',
      message: 'spellsToScribe must be an array of strings when provided',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) && (value as unknown[]).every((v) => typeof v === 'string'))
        );
      },
    },
    {
      field: 'materialComponents',
      message: 'materialComponents must be an array of {name, cost, quantity, available}',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) &&
            (value as unknown[]).every((v) => {
              if (typeof v !== 'object' || v === null) return false;
              const o = v as {
                name?: unknown;
                cost?: unknown;
                quantity?: unknown;
                available?: unknown;
              };
              return (
                typeof o.name === 'string' &&
                typeof o.cost === 'number' &&
                typeof o.quantity === 'number' &&
                typeof o.available === 'boolean'
              );
            }))
        );
      },
    },
    {
      field: 'workspaceQuality',
      message: `workspaceQuality must be one of: ${WORKSPACE_QUALITY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, WORKSPACE_QUALITY);
      },
    },
    {
      field: 'assistantPresent',
      message: 'assistantPresent must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// SpellResearch
const RESEARCH_TYPES = ['magic-user', 'cleric', 'druid', 'illusionist'] as const;
const LIBRARY_QUALITY = ['poor', 'average', 'good', 'excellent'] as const;
export const SpellResearchValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('spellLevel'),
    ValidationEngine.positiveInteger('spellLevel'),
    ValidationEngine.required('spellName'),
    ValidationEngine.required('spellDescription'),
    ValidationEngine.required('researchType'),
    {
      field: 'researchType',
      message: `researchType must be one of: ${RESEARCH_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, RESEARCH_TYPES);
      },
    },
    {
      field: 'timeInWeeks',
      message: 'timeInWeeks must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) > 0);
      },
    },
    {
      field: 'costInGold',
      message: 'costInGold must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) >= 0);
      },
    },
    {
      field: 'specialMaterials',
      message: 'specialMaterials must be an array of {name, cost, rarity}',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) &&
            (value as unknown[]).every((v) => {
              if (typeof v !== 'object' || v === null) return false;
              const o = v as { name?: unknown; cost?: unknown; rarity?: unknown };
              const rarity = o.rarity;
              return (
                typeof o.name === 'string' &&
                typeof o.cost === 'number' &&
                typeof rarity === 'string' &&
                ['common', 'uncommon', 'rare', 'very-rare'].includes(rarity)
              );
            }))
        );
      },
    },
    {
      field: 'mentorAvailable',
      message: 'mentorAvailable must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'libraryQuality',
      message: `libraryQuality must be one of: ${LIBRARY_QUALITY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, LIBRARY_QUALITY);
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// TurnUndead
const ALIGNMENTS = ['good', 'neutral', 'evil'] as const;
export const TurnUndeadValidator: Validator<AnyParams> = {
  rules: [
    ValidationEngine.required('characterId'),
    ValidationEngine.required('targetUndeadIds'),
    ValidationEngine.arrayNotEmpty('targetUndeadIds'),
    {
      field: 'situationalModifiers.holySymbolBonus',
      message: 'holySymbolBonus must be between -5 and +5 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= -5 && value <= 5);
      },
    },
    {
      field: 'situationalModifiers.spellBonus',
      message: 'spellBonus must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.areaBonus',
      message: 'areaBonus must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.alignment',
      message: `alignment must be one of: ${ALIGNMENTS.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ALIGNMENTS);
      },
    },
    {
      field: 'situationalModifiers.isEvil',
      message: 'isEvil must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'massAttempt',
      message: 'massAttempt must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
  ],
  validate(params) {
    return ValidationEngine.validateObject(params as AnyParams, this.rules);
  },
};

// Expand Validators registry for discoverability (optional)
export const ExtendedValidators = {
  ...({} as Record<string, Validator<AnyParams>>),
  CreateCharacterCommand: CreateCharacterValidator,
  LevelUpCommand: LevelUpValidator,
  ThiefSkillCheckCommand: ThiefSkillCheckValidator,
  GainExperienceCommand: GainExperienceValidator,
  FallingDamageCommand: FallingDamageValidator,
  MonsterGenerationCommand: MonsterGenerationValidator,
  ReactionRollCommand: ReactionRollValidator,
  MagicItemCreationCommand: MagicItemCreationValidator,
  SpellResearchCommand: SpellResearchValidator,
  TurnUndeadCommand: TurnUndeadValidator,
};
