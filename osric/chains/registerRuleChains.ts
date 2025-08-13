// Combat
import { buildAttackChain } from '@osric/chains/combat/attack';
import { buildGrappleChain } from '@osric/chains/combat/grapple';
import { buildInitiativeChain } from '@osric/chains/combat/initiative';
import { buildSavingThrowChain } from '@osric/chains/combat/savingThrow';
import type { RuleEngine } from '@osric/core/RuleEngine';
import { COMMAND_TYPES } from '@osric/types/constants';

// Character
import { buildCreateCharacterChain } from '@osric/chains/character/createCharacter';
import { buildGainExperienceChain } from '@osric/chains/character/gainExperience';
import { buildLevelUpChain } from '@osric/chains/character/levelUp';
import { buildThiefSkillCheckChain } from '@osric/chains/character/thiefSkillCheck';
import { buildTurnUndeadChain } from '@osric/chains/character/turnUndead';

import { buildDrowningCheckChain } from '@osric/chains/exploration/drowningCheck';
import { buildFallingDamageChain } from '@osric/chains/exploration/fallingDamage';
import { buildForagingChain } from '@osric/chains/exploration/foraging';
// Exploration
import { buildMoveChain } from '@osric/chains/exploration/move';
import { buildSearchChain } from '@osric/chains/exploration/search';
import { buildTemperatureCheckChain } from '@osric/chains/exploration/temperatureCheck';
import { buildTerrainNavigationChain } from '@osric/chains/exploration/terrainNavigation';
import { buildWeatherCheckChain } from '@osric/chains/exploration/weatherCheck';

import { buildUnderwaterMoveChain } from '@osric/chains/combat/underwater';
import { buildLoyaltyCheckChain } from '@osric/chains/npc/loyaltyCheck';
import { buildMonsterGenerationChain } from '@osric/chains/npc/monsterGeneration';
import { buildMoraleCheckChain } from '@osric/chains/npc/moraleCheck';
// NPC
import { buildReactionRollChain } from '@osric/chains/npc/reactionRoll';

// Spells
import { buildCastSpellChain } from '@osric/chains/spells/castSpell';
import { buildIdentifyMagicItemChain } from '@osric/chains/spells/identifyMagicItem';
import { buildMagicItemCreationChain } from '@osric/chains/spells/magicItemCreation';
import { buildMemorizeSpellChain } from '@osric/chains/spells/memorizeSpell';
import { buildReadScrollChain } from '@osric/chains/spells/readScroll';

// System
import { buildRoundTickChain } from '@osric/chains/system/roundTick';

export function registerRuleChains(engine: RuleEngine): void {
  engine.registerRuleChain(COMMAND_TYPES.ATTACK, buildAttackChain());
  engine.registerRuleChain(COMMAND_TYPES.ROUND_TICK, buildRoundTickChain());
  engine.registerRuleChain(COMMAND_TYPES.SEARCH, buildSearchChain());
  engine.registerRuleChain(COMMAND_TYPES.FALLING_DAMAGE, buildFallingDamageChain());
  engine.registerRuleChain(COMMAND_TYPES.REACTION_ROLL, buildReactionRollChain());
  engine.registerRuleChain(COMMAND_TYPES.MORALE_CHECK, buildMoraleCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.LOYALTY_CHECK, buildLoyaltyCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.MOVE, buildMoveChain());
  engine.registerRuleChain(COMMAND_TYPES.UNDERWATER_MOVE, buildUnderwaterMoveChain());
  engine.registerRuleChain(COMMAND_TYPES.INITIATIVE, buildInitiativeChain());
  engine.registerRuleChain(COMMAND_TYPES.SAVING_THROW, buildSavingThrowChain());
  engine.registerRuleChain(COMMAND_TYPES.GRAPPLE, buildGrappleChain());
  engine.registerRuleChain(COMMAND_TYPES.CREATE_CHARACTER, buildCreateCharacterChain());
  engine.registerRuleChain(COMMAND_TYPES.GAIN_EXPERIENCE, buildGainExperienceChain());
  engine.registerRuleChain(COMMAND_TYPES.LEVEL_UP, buildLevelUpChain());
  engine.registerRuleChain(COMMAND_TYPES.THIEF_SKILL_CHECK, buildThiefSkillCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.TURN_UNDEAD, buildTurnUndeadChain());
  engine.registerRuleChain(COMMAND_TYPES.CAST_SPELL, buildCastSpellChain());
  engine.registerRuleChain(COMMAND_TYPES.MEMORIZE_SPELL, buildMemorizeSpellChain());
  engine.registerRuleChain(COMMAND_TYPES.READ_SCROLL, buildReadScrollChain());
  engine.registerRuleChain(COMMAND_TYPES.IDENTIFY_MAGIC_ITEM, buildIdentifyMagicItemChain());
  engine.registerRuleChain(COMMAND_TYPES.MAGIC_ITEM_CREATION, buildMagicItemCreationChain());
  engine.registerRuleChain(COMMAND_TYPES.WEATHER_CHECK, buildWeatherCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.TEMPERATURE_CHECK, buildTemperatureCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.DROWNING_CHECK, buildDrowningCheckChain());
  engine.registerRuleChain(COMMAND_TYPES.TERRAIN_NAVIGATION, buildTerrainNavigationChain());
  engine.registerRuleChain(COMMAND_TYPES.FORAGING, buildForagingChain());
  engine.registerRuleChain(COMMAND_TYPES.MONSTER_GENERATION, buildMonsterGenerationChain());
}
