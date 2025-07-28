import type {
  Action,
  ActionResult,
  Armor,
  Character,
  Item,
  Monster,
  Spell,
  Weapon,
  WeaponType,
} from '@rules/types';

// Type predicate functions
function isWeapon(item: Item | Weapon | Armor): item is Weapon {
  return 'damage' in item && 'type' in item && (item as Weapon).type !== undefined;
}

/**
 * Checks if a weapon is effective underwater
 */
export function isWeaponEffectiveUnderwater(weapon: Item | Weapon | Armor): boolean {
  // Only weapons can be effective/ineffective underwater
  if (!isWeapon(weapon)) return false;

  // List of weapons that work underwater
  const effectiveWeapons = [
    'dagger',
    'spear',
    'trident',
    'harpoon',
    'net',
    'sling',
    'crossbow', // Special case - crossbows can be fired once before reloading
  ];

  return effectiveWeapons.some((w) => weapon.name.toLowerCase().includes(w));
}

/**
 * Applies underwater penalties to an attack
 */
export function applyUnderwaterPenalties(
  action: Action,
  attacker: Character | Monster
): ActionResult {
  const { item } = action;

  // If no item or not a weapon, return early
  if (!item || !isWeapon(item)) {
    return {
      success: true,
      message: '',
      damage: null,
      effects: null,
    };
  }

  // Check if weapon is effective
  if (!isWeaponEffectiveUnderwater(item)) {
    return {
      success: false,
      message: `${item.name} is ineffective underwater!`,
      damage: null,
      effects: null,
    };
  }

  // Handle ranged weapons (including crossbows)
  if (item.type === 'Ranged' || item.name.toLowerCase().includes('crossbow')) {
    // Can only fire once before reloading
    return {
      success: true,
      message: `${attacker.name} fires ${item.name} (must reload after this shot)`,
      damage: null,
      effects: [{ type: 'reloadRequired', source: item.id, duration: 1 }], // Duration of 1 round
    };
  }

  // Apply penalties to melee weapons
  if (item.type === 'Melee') {
    return {
      success: true,
      message: `${attacker.name} attacks with ${item.name} (reduced effectiveness)`,
      damage: null,
      effects: ['underwater_attack_penalty:-2', 'underwater_damage_penalty:-2'],
    };
  }

  // Default case
  return {
    success: true,
    message: '',
    damage: null,
    effects: [],
  };
}

/**
 * Checks if a spell can be cast underwater
 * @param spell The spell to check
 */
export function canCastSpellUnderwater(spell: Spell): boolean {
  // Spells with only verbal components can be cast underwater
  if (spell.components && spell.components.length === 1 && spell.components[0] === 'V') {
    return true;
  }

  // Spells with fire or lightning descriptors fail underwater
  const failedDescriptors = ['fire', 'lightning', 'electricity'];
  const spellText = `${spell.name} ${spell.description}`.toLowerCase();

  if (failedDescriptors.some((desc) => spellText.includes(desc))) {
    return false;
  }

  // Spells with somatic or material components fail underwater
  if (spell.components?.some((c) => ['S', 'M'].includes(c))) {
    return false;
  }

  // All other spells can be cast with a -2 penalty to the caster's level
  return true;
}

/**
 * Handles spellcasting underwater
 */
export function handleUnderwaterSpell(spell: Spell, caster: Character | Monster): ActionResult {
  // Check if spell can be cast underwater
  if (!canCastSpellUnderwater(spell)) {
    // Lightning spells backfire on the caster
    if (spell.name.toLowerCase().includes('lightning')) {
      return {
        success: false,
        message: `${spell.name} backfires on ${caster.name}!`,
        damage: [spell.level * 2],
        effects: [
          {
            type: 'stun',
            source: 'lightning_spell_backfire',
            duration: 1, // 1 round
          },
        ],
      };
    }

    // Other invalid spells simply fail
    return {
      success: false,
      message: `cannot cast ${spell.name} underwater due to material components`,
      damage: null,
      effects: null,
    };
  }

  // Spell succeeds with normal effects
  return {
    success: true,
    message: `${caster.name} casts ${spell.name}!`,
    damage: null,
    effects: [],
  };
}
