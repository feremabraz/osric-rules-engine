export const TimeUnitTypes = ['Round', 'Turn', 'Hour', 'Day', 'Week', 'Month', 'Year'] as const;
export type TimeUnitType = (typeof TimeUnitTypes)[number];

export interface TimeUnit {
  type: TimeUnitType;
  value: number;
}

export const TimeOfDayPhases = [
  'Dawn',
  'Morning',
  'Noon',
  'Afternoon',
  'Dusk',
  'Evening',
  'Midnight',
  'DeepNight',
] as const;
export type TimeOfDayPhase = (typeof TimeOfDayPhases)[number];

export const Seasons = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Season = (typeof Seasons)[number];

export interface GameTime {
  rounds: number;
  turns: number;
  hours: number;
  days: number;
  weeks: number;
  months: number;
  years: number;
}

export interface TimeTracking {
  gameTime: GameTime;
  phase: TimeOfDayPhase;
  season: Season;
  inCombat: boolean;
  activeEffects: TimedEffect[];
}

export interface TimedEffect {
  id: string;
  name: string;
  description: string;
  duration: TimeUnit;
  remaining: TimeUnit;
  source: string;
  targetId: string | null;
  onExpire: () => void;
}

export interface DurationDescriptor {
  value: number;
  unit: TimeUnitType;
}

export interface TimeModifier {
  name: string;
  description: string;
  phase: TimeOfDayPhase | null;
  season: Season | null;
  effects: {
    // Ability checks
    strengthModifier?: number;
    dexterityModifier?: number;
    constitutionModifier?: number;
    intelligenceModifier?: number;
    wisdomModifier?: number;
    charismaModifier?: number;
    // Combat modifiers
    attackModifier?: number;
    damageModifier?: number;
    armorClassModifier?: number;
    initiativeModifier?: number;
    // Travel modifiers
    movementModifier?: number;
    encumbranceModifier?: number;
    // Spell modifiers
    spellDurationModifier?: number;
    spellRangeModifier?: number;
  };
}
