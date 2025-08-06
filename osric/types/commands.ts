import type { Command } from '@osric/core/Command';
import type { CommandType } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';

export interface BaseCommandParams {
  readonly actorId: string;
  readonly targetIds?: string[];
}

export interface CreateCharacterParams extends BaseCommandParams {
  readonly race: string;
  readonly characterClass: string;
  readonly abilityScores?: Record<string, number>;
  readonly name?: string;
}

export interface LevelUpParams extends BaseCommandParams {
  readonly newLevel: number;
  readonly hitPointRoll?: number;
}

export interface MultiClassParams extends BaseCommandParams {
  readonly classes: string[];
}

export interface AssignAbilityScoresParams extends BaseCommandParams {
  readonly scores: Record<string, number>;
}

export interface AttackParams extends BaseCommandParams {
  readonly targetId: string;
  readonly weaponId?: string;
  readonly situationalModifiers?: number;
}

export interface InitiativeParams extends BaseCommandParams {
  readonly weaponId?: string;
  readonly spellId?: string;
}

export interface GrappleParams extends BaseCommandParams {
  readonly targetId: string;
  readonly grappleType: 'grab' | 'pin' | 'damage';
}

export interface UseShieldParams extends BaseCommandParams {
  readonly shieldId: string;
  readonly defensive?: boolean;
}

export interface CastSpellParams extends BaseCommandParams {
  readonly spellName: string;
  readonly spellLevel: number;
  readonly targetIds: string[];
  readonly ignoreComponents?: boolean;
  readonly ignoreMemorization?: boolean;
}

export interface MemorizeSpellParams extends BaseCommandParams {
  readonly spellName: string;
  readonly spellLevel: number;
}

export interface ScrollReadParams extends BaseCommandParams {
  readonly scrollId: string;
  readonly targetIds: string[];
}

export interface IdentifyMagicItemParams extends BaseCommandParams {
  readonly itemId: string;
  readonly method: 'spell' | 'study';
}

export interface MoveParams extends BaseCommandParams {
  readonly destination: string;
  readonly movementType?: string;
  readonly cautious?: boolean;
}

export interface SearchParams extends BaseCommandParams {
  readonly searchType: 'secret-door' | 'trap' | 'general';
  readonly area: string;
  readonly timeSpent?: number;
}

export interface SurvivalCheckParams extends BaseCommandParams {
  readonly checkType: 'food' | 'water' | 'exposure';
  readonly environment?: string;
  readonly duration?: number;
}

export interface EnvironmentalHazardParams extends BaseCommandParams {
  readonly hazardType: 'falling' | 'drowning' | 'temperature' | 'suffocation';
  readonly severity?: number;
  readonly modifiers?: Record<string, number>;
}

export interface WeatherCheckParams extends BaseCommandParams {
  readonly currentWeather: {
    type: string;
    intensity: string;
    duration: number;
    temperature: string;
  };
  readonly activityType:
    | 'travel'
    | 'combat'
    | 'spellcasting'
    | 'ranged-attack'
    | 'rest'
    | 'foraging';
  readonly exposureTime?: number;
}

export interface TerrainNavigationParams extends BaseCommandParams {
  readonly terrainType: {
    name: string;
    movementModifier: number;
    gettingLostChance: number;
    visibilityDistance: number;
  };
  readonly distance: number;
  readonly navigationMethod: 'landmark' | 'compass' | 'stars' | 'ranger-tracking' | 'none';
  readonly hasMap: boolean;
  readonly timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
}

export interface ForagingParams extends BaseCommandParams {
  readonly forageType: 'food' | 'water' | 'both';
  readonly terrain: string;
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
  readonly timeSpent: number;
  readonly groupSize: number;
  readonly hasForagingTools: boolean;
}

export interface MonsterGenerationParams extends BaseCommandParams {
  readonly terrainType:
    | 'dungeon'
    | 'forest'
    | 'plains'
    | 'hills'
    | 'mountains'
    | 'swamp'
    | 'desert'
    | 'arctic'
    | 'ocean'
    | 'city';
  readonly encounterLevel: number;
  readonly partySize: number;
  readonly timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  readonly weather?: 'clear' | 'rain' | 'storm' | 'fog' | 'snow';
  readonly specialConditions?: {
    guardedArea?: boolean;
    lair?: boolean;
    wandering?: boolean;
    civilized?: boolean;
  };
  readonly forceMonsterType?: string;
}

export interface MonsterBehaviorParams extends BaseCommandParams {
  readonly monsterId: string;
  readonly situation: 'encounter' | 'combat' | 'pursuit' | 'negotiation';
  readonly opponents?: unknown[];
  readonly environment?: string;
  readonly previousActions?: string[];
}

export interface TreasureGenerationParams extends BaseCommandParams {
  readonly treasureType: string;
  readonly monsterLevel: number;
  readonly isLair: boolean;
  readonly partySize?: number;
}

export interface ReactionRollParams extends BaseCommandParams {
  readonly npcId: string;
  readonly situation?: string;
  readonly modifiers?: Record<string, number>;
}

export interface MoraleCheckParams extends BaseCommandParams {
  readonly reason: string;
  readonly modifiers?: Record<string, number>;
}

export interface LoyaltyCheckParams extends BaseCommandParams {
  readonly henchmanId: string;
  readonly situation: string;
  readonly modifiers?: Record<string, number>;
}

export interface CommandTypeRegistry {
  [COMMAND_TYPES.CREATE_CHARACTER]: CreateCharacterParams;
  [COMMAND_TYPES.LEVEL_UP]: LevelUpParams;
  [COMMAND_TYPES.MULTI_CLASS]: MultiClassParams;
  [COMMAND_TYPES.ASSIGN_ABILITY_SCORES]: AssignAbilityScoresParams;

  [COMMAND_TYPES.ATTACK]: AttackParams;
  [COMMAND_TYPES.INITIATIVE]: InitiativeParams;
  [COMMAND_TYPES.GRAPPLE]: GrappleParams;
  [COMMAND_TYPES.USE_SHIELD]: UseShieldParams;

  [COMMAND_TYPES.CAST_SPELL]: CastSpellParams;
  [COMMAND_TYPES.MEMORIZE_SPELL]: MemorizeSpellParams;
  [COMMAND_TYPES.READ_SCROLL]: ScrollReadParams;
  [COMMAND_TYPES.IDENTIFY_MAGIC_ITEM]: IdentifyMagicItemParams;

  [COMMAND_TYPES.MOVE]: MoveParams;
  [COMMAND_TYPES.SEARCH]: SearchParams;
  [COMMAND_TYPES.SURVIVAL_CHECK]: SurvivalCheckParams;
  [COMMAND_TYPES.ENVIRONMENTAL_HAZARD]: EnvironmentalHazardParams;

  [COMMAND_TYPES.REACTION_ROLL]: ReactionRollParams;
  [COMMAND_TYPES.MORALE_CHECK]: MoraleCheckParams;
  [COMMAND_TYPES.LOYALTY_CHECK]: LoyaltyCheckParams;
}

export type CommandParamsFor<T extends CommandType> = T extends keyof CommandTypeRegistry
  ? CommandTypeRegistry[T]
  : never;

export type CommandParams = CommandTypeRegistry[keyof CommandTypeRegistry];

export interface CommandFactory {
  create<T extends CommandType>(type: T, params: CommandParamsFor<T>): Command;
}

export interface CommandMetadata {
  readonly type: CommandType;
  readonly description: string;
  readonly requiredParams: readonly string[];
  readonly optionalParams: readonly string[];
  readonly rulesRequired: readonly string[];
  readonly category: 'character' | 'combat' | 'magic' | 'exploration' | 'npc';
}

export const COMMAND_METADATA: Partial<Record<CommandType, CommandMetadata>> = {
  [COMMAND_TYPES.CREATE_CHARACTER]: {
    type: COMMAND_TYPES.CREATE_CHARACTER,
    description: 'Create a new character with specified race and class',
    requiredParams: ['actorId', 'race', 'characterClass'],
    optionalParams: ['abilityScores', 'name'],
    rulesRequired: ['ability-score-generation', 'class-requirements', 'racial-abilities'],
    category: 'character',
  },
  [COMMAND_TYPES.LEVEL_UP]: {
    type: COMMAND_TYPES.LEVEL_UP,
    description: 'Advance a character to the next level',
    requiredParams: ['actorId', 'newLevel'],
    optionalParams: ['hitPointRoll'],
    rulesRequired: ['experience-requirements', 'hit-point-advancement', 'spell-progression'],
    category: 'character',
  },
  [COMMAND_TYPES.ATTACK]: {
    type: COMMAND_TYPES.ATTACK,
    description: 'Perform a melee or ranged attack',
    requiredParams: ['actorId', 'targetId'],
    optionalParams: ['weaponId', 'situationalModifiers'],
    rulesRequired: ['attack-roll', 'damage-calculation', 'armor-class'],
    category: 'combat',
  },
  [COMMAND_TYPES.CAST_SPELL]: {
    type: COMMAND_TYPES.CAST_SPELL,
    description: 'Cast a memorized spell',
    requiredParams: ['actorId', 'spellName', 'spellLevel', 'targetIds'],
    optionalParams: ['ignoreComponents', 'ignoreMemorization'],
    rulesRequired: ['spell-memorization', 'component-check', 'spell-effects', 'saving-throws'],
    category: 'magic',
  },
} as const;
