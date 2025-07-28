import type { Character, InitiativeResult, Monster, Spell, Weapon } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Roll initiative for a single character or monster
 */
export const combatInitiativeRoll = (
  entity: Character | Monster,
  weapon?: Weapon,
  spell?: Spell
): InitiativeResult => {
  // Base initiative roll is 1d10 (using the existing dice utility)
  const baseRoll = roll(10);

  // Apply modifiers
  let modifier = 0;

  // Apply dexterity reaction adjustment for characters
  if ('abilities' in entity && entity.abilityModifiers.dexterityReaction) {
    modifier -= entity.abilityModifiers.dexterityReaction;
  }

  // Get weapon speed factor and apply to initiative
  let weaponSpeedFactor = 0;
  if (weapon) {
    weaponSpeedFactor = weapon.speed;
  } else if (spell) {
    // Spells have speed factor of 1 per casting segment
    const castingSegments = Number.parseInt(spell.castingTime.split(' ')[0], 10) || 1;
    weaponSpeedFactor = castingSegments;
  }

  // Lower is better for initiative in OSRIC, but higher weapon speed increases initiative
  // (making it worse)
  const initiativeScore = baseRoll + modifier + weaponSpeedFactor;

  return {
    roller: entity,
    initiative: initiativeScore,
    surprise: false, // Set in separate surprise check
    segmentOrder: initiativeScore,
    weaponSpeedFactor, // Store for tie-breaking
  };
};

/**
 * Roll initiative for a group (party or monsters).
 * Returns an array of InitiativeResult, sorted by initiative (lowest first).
 */
export const rollGroupInitiative = (
  entities: (Character | Monster)[],
  weapons?: Record<string, Weapon>, // Map of entity.id to weapon
  spells?: Record<string, Spell> // Map of entity.id to spell being cast
): InitiativeResult[] => {
  const results: InitiativeResult[] = entities.map((entity) => {
    const weapon = weapons ? weapons[entity.id] : undefined;
    const spell = spells ? spells[entity.id] : undefined;
    return combatInitiativeRoll(entity, weapon, spell);
  });

  // Sort by initiative (lowest first)
  return results.sort((a, b) => {
    // First sort by initiative score
    const initiativeDiff = a.initiative - b.initiative;
    if (initiativeDiff !== 0) return initiativeDiff;

    // If initiative ties, sort by weapon speed factor (lower is faster)
    return a.weaponSpeedFactor - b.weaponSpeedFactor;
  });
};

/**
 * Roll for group initiative.
 * Returns a value for the whole group plus the best weapon speed factor for tie-breaking.
 */
export const rollSingleGroupInitiative = (
  entities: (Character | Monster)[],
  weapons?: Record<string, Weapon>,
  spells?: Record<string, Spell>
): number => {
  // Roll 1d10 for the group
  const baseRoll = roll(10);

  // Find the best (highest) dexterity reaction adjustment in the group
  let bestReactionAdj = 0;

  for (const entity of entities) {
    if ('abilities' in entity && entity.abilityModifiers.dexterityReaction) {
      const reactionAdj = entity.abilityModifiers.dexterityReaction;
      if (reactionAdj > bestReactionAdj) {
        bestReactionAdj = reactionAdj;
      }
    }
  }

  // Find the best (lowest) weapon speed factor in the group for tie-breaking
  let bestSpeedFactor = Number.POSITIVE_INFINITY; // Initialize to a high value so first comparison will work

  if (weapons) {
    for (const entity of entities) {
      const weapon = weapons[entity.id];
      if (weapon && weapon.speed < bestSpeedFactor) {
        bestSpeedFactor = weapon.speed;
      }
    }
  }

  // Check spells too, which have speed factor = casting segments
  if (spells) {
    for (const entity of entities) {
      const spell = spells[entity.id];
      if (spell) {
        const castingSegments = Number.parseInt(spell.castingTime.split(' ')[0], 10) || 1;
        if (castingSegments < bestSpeedFactor) {
          bestSpeedFactor = castingSegments;
        }
      }
    }
  }

  // If no weapons or spells found, use 0 as default
  if (bestSpeedFactor === Number.POSITIVE_INFINITY) {
    bestSpeedFactor = 0;
  }

  // For single group initiative, subtract the best reaction adjustment
  // to maintain compatibility with the group init mechanics (higher dex = lower initiative)
  return baseRoll - bestReactionAdj + bestSpeedFactor;
};

/**
 * Check for surprise
 * Returns true if the target is surprised
 */
export const checkSurprise = (target: Character | Monster, circumstanceModifier = 0): boolean => {
  // Base chance of surprise is 2 in 6
  const roll6 = roll(6);

  // Calculate surprise threshold (1-2 is surprised by default)
  let surpriseThreshold = 2;

  // Adjust for race (some races are harder to surprise)
  if ('race' in target) {
    if (['Elf', 'Half-Elf'].includes(target.race)) {
      surpriseThreshold -= 1; // Elves and Half-Elves are only surprised on a 1
    }
  }

  // Apply circumstance modifier
  surpriseThreshold += circumstanceModifier;

  // Ensure threshold is between 0 and 6
  surpriseThreshold = Math.max(0, Math.min(6, surpriseThreshold));

  // Return true if roll is less than or equal to threshold
  return roll6 <= surpriseThreshold;
};

/**
 * Check for group surprise
 * Returns an array of booleans indicating which entities are surprised
 */
export const checkGroupSurprise = (
  entities: (Character | Monster)[],
  circumstanceModifier = 0
): boolean[] => {
  return entities.map((entity) => checkSurprise(entity, circumstanceModifier));
};

/**
 * Manage a complete combat turn's initiative and ordering
 */
export const manageCombatOrder = (
  party: Character[],
  monsters: Monster[],
  partyWeapons?: Record<string, Weapon>,
  monsterWeapons?: Record<string, Weapon>,
  partySpells?: Record<string, Spell>,
  monsterSpells?: Record<string, Spell>
): {
  order: (Character | Monster)[];
  partyInitiative: number;
  monsterInitiative: number;
  surprised: Record<string, boolean>;
  weaponSpeedUsed: boolean;
} => {
  // Roll initiative for both groups
  const partyInit = rollSingleGroupInitiative(party, partyWeapons, partySpells);
  const monsterInit = rollSingleGroupInitiative(monsters, monsterWeapons, monsterSpells);

  // Check for surprise
  const partySurprised = checkGroupSurprise(party);
  const monstersSurprised = checkGroupSurprise(monsters);

  // Build a surprise record by entity ID
  const surprised: Record<string, boolean> = {};

  party.forEach((char, i) => {
    surprised[char.id] = partySurprised[i];
  });

  monsters.forEach((monster, i) => {
    surprised[monster.id] = monstersSurprised[i];
  });

  // Track if we needed to use weapon speed factors for tie-breaking
  let weaponSpeedUsed = false;

  // Determine order based on initiative score
  let order: (Character | Monster)[];

  if (partyInit < monsterInit) {
    // Party goes first
    order = [...party, ...monsters];
  } else if (monsterInit < partyInit) {
    // Monsters go first
    order = [...monsters, ...party];
  } else {
    // Complete tie - actions are simultaneous
    // For simplicity, we'll alternate between party and monsters
    weaponSpeedUsed = true;
    order = [];
    const maxLength = Math.max(party.length, monsters.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < party.length) order.push(party[i]);
      if (i < monsters.length) order.push(monsters[i]);
    }
  }

  // Remove surprised entities from the first round
  const orderWithoutSurprised = order.filter((entity) => !surprised[entity.id]);

  return {
    order: orderWithoutSurprised,
    partyInitiative: partyInit,
    monsterInitiative: monsterInit,
    surprised,
    weaponSpeedUsed,
  };
};
