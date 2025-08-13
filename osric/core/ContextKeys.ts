// Canonical temporary context keys (domain:feature:aspect) to prevent ad-hoc strings.
// Use these constants instead of inline string literals when setting/getting temporary context.

export const ContextKeys = {
  // Character creation
  CHARACTER_CREATION_CONTEXT: 'character:creation:context',
  CHARACTER_CREATION_PARAMS: 'character:creation:params',
  CHARACTER_CREATION_ABILITY_SCORES: 'character:creation:ability-scores',
  CHARACTER_CREATION_ADJUSTED_SCORES: 'character:creation:adjusted-scores',
  CHARACTER_CREATION_DATA: 'character:creation:data',
  CHARACTER_CREATION_RACE: 'character:creation:race',
  CHARACTER_CREATION_ALIGNMENT: 'character:creation:alignment',
  CHARACTER_CREATION_CLASS_VALIDATION: 'character:creation:class-validation',
  CHARACTER_CREATION_STARTING_GOLD: 'character:creation:starting-gold',
  CHARACTER_CREATION_STARTING_EQUIPMENT: 'character:creation:starting-equipment',

  // Saving throws
  SAVING_THROW_PARAMS: 'character:saving-throw:params',

  // Experience
  CHARACTER_EXPERIENCE_GAIN_PARAMS: 'character:experience:gain-params',

  // Thief skills
  THIEF_SKILL_PARAMS: 'character:thief-skill:params',

  // Turn Undead
  TURN_UNDEAD_PARAMS: 'character:turn-undead:params',

  // Exploration
  FORAGING_CONTEXT: 'exploration:foraging:context',
  EXPLORATION_MOVEMENT_ENCUMBRANCE_LEVEL: 'movement:encumbrance-level',
  EXPLORATION_MOVEMENT_BASE_RATE: 'movement:base-rate',
  EXPLORATION_FALLING_DAMAGE_PARAMS: 'exploration:falling-damage:params',
  EXPLORATION_MOVEMENT_REQUEST_PARAMS: 'movement-request-params',
  EXPLORATION_SEARCH_REQUEST_PARAMS: 'search-request-params',
  EXPLORATION_SEARCH_CONTEXT: 'exploration:search:context',
  EXPLORATION_VISIBILITY_PARAMS: 'exploration:visibility:params',
  EXPLORATION_VISIBILITY_RESULT: 'exploration:visibility:result',

  // NPC / Monsters
  NPC_MONSTER_GENERATION_PARAMS: 'npc:monster:generation:params',
  NPC_MONSTER_BEHAVIOR_PARAMS: 'npc:monster:behavior:params',
  NPC_TREASURE_CONTEXT: 'npc:treasure:context',
  NPC_TREASURE_HOARD: 'npc:treasure:hoard',
  NPC_SPECIAL_ABILITY_CONTEXT: 'npc:special-ability:context',
  NPC_SPECIAL_ABILITIES: 'npc:special-ability:abilities',
  NPC_REACTION_ROLL_PARAMS: 'npc:reaction-roll:params',
  NPC_LAST_REACTION_RESULT: 'npc:reaction:last-result',

  // Combat (attack preparation, two weapon, etc.)
  COMBAT_ATTACK_CONTEXT: 'combat:attack:context',
  COMBAT_ATTACK_ROLL_RESULT: 'combat:attack:roll-result',
  COMBAT_TWO_WEAPON_CONTEXT: 'combat:two-weapon:context',
  COMBAT_TWO_WEAPON_RESULTS: 'combat:two-weapon:results',
  COMBAT_MAIN_HAND_RESULT: 'combat:main-hand:result',
  COMBAT_OFF_HAND_RESULT: 'combat:off-hand:result',
  COMBAT_TWO_WEAPON_ELIGIBILITY: 'combat:two-weapon:eligibility',
  COMBAT_MAIN_HAND_WEAPON: 'combat:main-hand:weapon',
  COMBAT_OFF_HAND_WEAPON: 'combat:off-hand:weapon',
  COMBAT_ATTACKS_THIS_ROUND: 'combat:attacks-this-round',
  COMBAT_MULTIPLE_ATTACK_RESULTS: 'combat:multiple-attack:results',
  COMBAT_FRACTIONAL_ATTACKS_CARRIED: 'combat:fractional-attacks-carried',
  COMBAT_ATTACK_PRECEDENCE: 'combat:attack:precedence',

  // Initiative
  COMBAT_INITIATIVE_CONTEXT: 'combat:initiative:context',
  COMBAT_INITIATIVE_RESULTS: 'combat:initiative:results',
  COMBAT_INITIATIVE_ORDER: 'combat:initiative:order',
  COMBAT_SURPRISE_RESULTS: 'combat:surprise:results',

  // Aerial combat
  COMBAT_AERIAL_CONTEXT: 'combat:aerial:context',
  COMBAT_AERIAL_MODIFIERS: 'combat:aerial:modifiers',
  COMBAT_AERIAL_DIVE_EFFECTS: 'combat:aerial:dive:effects',
  COMBAT_AERIAL_DAMAGE_MULTIPLIER: 'combat:aerial:damage:multiplier',
  COMBAT_AERIAL_MOVEMENT: 'combat:aerial:movement',
  COMBAT_AERIAL_MOVEMENT_DIRECTION: 'combat:aerial:movement:direction',
  COMBAT_AERIAL_MOVEMENT_DISTANCE: 'combat:aerial:movement:distance',

  // Underwater combat/movement
  COMBAT_UNDERWATER_CONTEXT: 'combat:underwater:context',
  COMBAT_UNDERWATER_MOVEMENT_EFFECTS: 'underwater-movement-effects',
  COMBAT_UNDERWATER_SPELL_RESULT: 'underwater-spell-result',
  COMBAT_UNDERWATER_WEAPON_RESULT: 'underwater-weapon-result',
  COMBAT_UNDERWATER_COMBAT_PENALTIES: 'underwater-combat-penalties',

  // Mounted combat
  COMBAT_MOUNTED_CONTEXT: 'combat:mounted:context',
  COMBAT_MOUNTED_CHARGE_RESULT: 'combat:mounted:charge:result',
  COMBAT_MOUNTED_DAMAGE_MULTIPLIER: 'combat:mounted:damage:multiplier',
  COMBAT_MOUNTED_MODIFIERS: 'combat:mounted:modifiers',
  COMBAT_MOUNTED_DISMOUNT_RESULT: 'combat:mounted:dismount:result',
  COMBAT_MOUNTED_ELIGIBILITY: 'combat:mounted:eligibility',
  COMBAT_MOUNTED_RIDER: 'combat:mounted:rider',
  COMBAT_MOUNTED_MOUNT: 'combat:mounted:mount',

  // Grapple
  COMBAT_GRAPPLE_CONTEXT: 'combat:grapple:context',
  COMBAT_GRAPPLE_RESULT: 'combat:grapple:result',
  COMBAT_GRAPPLE_ATTACK_RESULT: 'combat:grapple:attack:result',
  COMBAT_GRAPPLE_STRENGTH_COMPARISON: 'combat:grapple:strength-comparison:result',
  COMBAT_GRAPPLE_FINAL_RESULT: 'combat:grapple:final:result',

  // Weapon & armor, damage
  COMBAT_WEAPON_ARMOR_CONTEXT: 'combat:weapon-armor:context',
  COMBAT_WEAPON_VS_ARMOR_ADJUSTMENT: 'combat:weapon-vs-armor:adjustment',
  COMBAT_WEAPON_TYPE: 'combat:weapon:type',
  COMBAT_WEAPON_IS_VERSATILE: 'combat:weapon:is-versatile',
  COMBAT_ARMOR_CATEGORY: 'combat:armor:category',
  COMBAT_ARMOR_EFFECTIVENESS: 'combat:armor:effectiveness',
  COMBAT_DAMAGE_RESULT: 'combat:damage:result',
  COMBAT_DAMAGE_VALUES: 'combat:damage:values',
  COMBAT_DAMAGE_APPLIED: 'combat:damage:applied',

  // Attack weapon/target (frequently accessed)
  COMBAT_ATTACK_WEAPON: 'combat:attack:weapon',
  COMBAT_ATTACK_TARGET: 'combat:attack:target',

  // Specialization
  COMBAT_SPECIALIZATION_CONTEXT: 'combat:specialization:context',
  COMBAT_SPECIALIZATION_ELIGIBILITY: 'combat:specialization:eligibility',
  COMBAT_SPECIALIZATION_BONUSES: 'combat:specialization:bonuses',
  COMBAT_SPECIALIZATION_REQUIREMENTS: 'combat:specialization:requirements',

  // Spells (research / progression / magic item)
  SPELL_RESEARCH_ACTIVE: 'spell:research:active',
  SPELL_SCROLL_CREATION_PROJECT: 'spell:scroll:creation:project',
  SPELL_SCROLL_USAGE_VALIDATED: 'spell:scroll:usage:validated',
  SPELL_UPDATED_MAGIC_ITEM: 'spell:magic-item:updated',

  // Spell progression & casting generic
  SPELL_CALC_CHARACTER: 'spell:calculate:character',
  SPELL_CALC_RESULT: 'spell:calculate:result',

  // Advanced spell casting & events
  SPELL_CASTER: 'spell:caster',
  SPELL_TO_CAST: 'spell:to-cast',
  // Legacy-cast names still used by rules; keep as constants
  SPELL_CAST_CASTER: 'spell:cast:caster',
  SPELL_CAST_SPELL: 'spell:cast:spell',
  SPELL_CAST_TARGETS: 'spell:cast:targets',
  SPELL_CAST_COMPONENTS: 'spell:cast:components',
  SPELL_CAST_VALIDATION: 'spell:cast:validation',
  SPELL_CAST_RESULT: 'spell:cast-spell:result',
  SPELL_CAST_EFFECT_RESULTS: 'spell:cast:effect-results',
  SPELL_ATTEMPT: 'spell:attempt',
  SPELL_CONCENTRATION_CHECK: 'spell:concentration:check',
  SPELL_INTERACTION: 'spell:interaction',
  SPELL_WILD_MAGIC_SURGE: 'spell:wild-magic:surge',
  SPELL_ENDED: 'spell:ended',
  SPELL_ADV_RESEARCH_PROJECT: 'spell:advanced-research:project',

  // Research phases
  SPELL_RESEARCH_REQUEST: 'spell:research:request',
  SPELL_RESEARCH_START: 'spell:research:start',
  SPELL_RESEARCH_PROGRESS: 'spell:research:progress',
  SPELL_RESEARCH_COMPLETE: 'spell:research:complete',
  SPELL_RESEARCH_LEARN: 'spell:research:learn',
  SPELL_RESEARCH_SETBACK: 'spell:research:setback',
  SPELL_RESEARCH_COMPLETED_EVENT: 'spell:research:completed-event',
  SPELL_RESEARCH_CATASTROPHE: 'spell:research:catastrophe',

  // Scroll creation and usage
  SPELL_SCROLL_REQUIREMENTS: 'spell:scroll:requirements',
  SPELL_SCROLL_CREATION_CHARACTER: 'spell:scroll:creation:character',
  SPELL_SCROLL_CREATION_LEVEL: 'spell:scroll:creation:level',
  SPELL_SCROLL_PROGRESS_RESULT: 'spell:scroll:progress:result',
  SPELL_SCROLL_USAGE_SCROLL: 'spell:scroll:usage:scroll',
  SPELL_SCROLL_CASTING_CHECK: 'spell:scroll:casting:check',
  SPELL_SCROLL_CAST_RESULT: 'spell:scroll:cast:result',
  SPELL_SCROLL_CASTING_SCROLL: 'spell:scroll:casting:scroll',
  SPELL_SCROLL_CASTING_CASTER: 'spell:scroll:casting:caster',
  SPELL_SCROLL_READER: 'spell:scroll:reader',
  SPELL_SCROLL_ITEM: 'spell:scroll:item',
  SPELL_SCROLL_CONTEXT: 'spell:scroll:context',

  // Scroll start parameters

  // Scroll progress inputs
  SPELL_SCROLL_PROGRESS_DAYS_WORKED: 'spell:scroll:progress:days-worked',

  // Scroll usage inputs
  SPELL_SCROLL_USAGE_CHARACTER: 'spell:scroll:usage:character',
  SPELL_SCROLL_USAGE_SCROLL_ID: 'spell:scroll:usage:scroll-id',

  // Magic items
  SPELL_NEW_MAGIC_ITEM: 'spell:magic-item:new',
  SPELL_MAGIC_ITEM_TO_USE: 'spell:magic-item:to-use',
  SPELL_MAGIC_ITEM_SAVING_THROW: 'spell:magic-item:saving-throw',
  SPELL_MAGIC_ITEM_CREATION_PARAMS: 'spell:magic-item:creation:params',
  SPELL_IDENTIFICATION_ATTEMPT: 'spell:magic-item:identification-attempt',
  IDENTIFY_ITEM_IDENTIFIER: 'identifyItem_identifier',
  IDENTIFY_ITEM_ITEM: 'identifyItem_item',
  IDENTIFY_ITEM_METHOD: 'identifyItem_method',
  IDENTIFY_ITEM_RESULT: 'identifyItem_result',
} as const;

export type ContextKey = (typeof ContextKeys)[keyof typeof ContextKeys];

// A lightweight typed wrapper for context keys to enable typed get/set without enforcing
// a global mapping. Use `typedKey<T>(ContextKeys.SOME_KEY)` at the call site for type safety.
export type TypedContextKey<T> = { key: ContextKey } & { __type?: T };

export function typedKey<T>(key: ContextKey): TypedContextKey<T> {
  return { key } as TypedContextKey<T>;
}
