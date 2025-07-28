import type {
  DurationDescriptor,
  GameTime,
  Season,
  Seasons,
  TimeOfDayPhase,
  TimeOfDayPhases,
  TimeUnit,
  TimeUnitType,
  TimedEffect,
} from '@rules/types';

// Constants
const ROUNDS_PER_TURN = 10;
const TURNS_PER_HOUR = 6;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30; // Simplified for game purposes
const MONTHS_PER_YEAR = 12;

// Base time system
export const createNewGameTime = (): GameTime => ({
  rounds: 0,
  turns: 0,
  hours: 8, // Start at 8:00 AM
  days: 1,
  weeks: 1,
  months: 1,
  years: 1,
});

// Determine time of day phase based on hour
export const determineTimeOfDayPhase = (hour: number): TimeOfDayPhase => {
  if (hour >= 5 && hour < 7) return 'Dawn';
  if (hour >= 7 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 13) return 'Noon';
  if (hour >= 13 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 19) return 'Dusk';
  if (hour >= 19 && hour < 23) return 'Evening';
  if (hour >= 23 || hour < 2) return 'Midnight';
  return 'DeepNight';
};

// Determine season based on month
export const determineSeason = (month: number): Season => {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
};

// Advance time by specified units
export const advanceTime = (
  currentTime: GameTime,
  amount: number,
  unit: TimeUnitType
): GameTime => {
  const newTime = { ...currentTime };

  switch (unit) {
    case 'Round':
      newTime.rounds += amount;
      while (newTime.rounds >= ROUNDS_PER_TURN) {
        newTime.rounds -= ROUNDS_PER_TURN;
        newTime.turns++;
      }
      break;
    case 'Turn':
      newTime.turns += amount;
      while (newTime.turns >= TURNS_PER_HOUR) {
        newTime.turns -= TURNS_PER_HOUR;
        newTime.hours++;
      }
      break;
    case 'Hour':
      newTime.hours += amount;
      while (newTime.hours >= HOURS_PER_DAY) {
        newTime.hours -= HOURS_PER_DAY;
        newTime.days++;
      }
      break;
    case 'Day':
      newTime.days += amount;
      // Update weeks if days exceeds threshold
      while (newTime.days > DAYS_PER_WEEK) {
        newTime.weeks++;
        newTime.days -= DAYS_PER_WEEK;
      }
      // Update months if days exceeds threshold
      while (newTime.days > DAYS_PER_MONTH) {
        newTime.months++;
        newTime.days -= DAYS_PER_MONTH;
      }
      break;
    case 'Week': {
      newTime.weeks += amount;
      // Convert full weeks to days and process them
      const daysToAdd = amount * DAYS_PER_WEEK;
      return advanceTime(newTime, daysToAdd, 'Day');
    }
    case 'Month':
      newTime.months += amount;
      while (newTime.months > MONTHS_PER_YEAR) {
        newTime.years++;
        newTime.months -= MONTHS_PER_YEAR;
      }
      break;
    case 'Year':
      newTime.years += amount;
      break;
  }

  return newTime;
};

// Format time for display
export const formatGameTime = (time: GameTime): string => {
  return `Year ${time.years}, Month ${time.months}, Day ${time.days}, ${time.hours}:${time.turns * 10}`;
};

// Convert a duration to a standardized unit (for calculations)
export const standardizeDuration = (duration: DurationDescriptor): TimeUnit => {
  const { value, unit } = duration;

  // For simplicity, convert everything to rounds
  let standardValue = value;

  switch (unit) {
    case 'Turn':
      standardValue = value * ROUNDS_PER_TURN;
      break;
    case 'Hour':
      standardValue = value * ROUNDS_PER_TURN * TURNS_PER_HOUR;
      break;
    case 'Day':
      standardValue = value * ROUNDS_PER_TURN * TURNS_PER_HOUR * HOURS_PER_DAY;
      break;
    case 'Week':
      standardValue = value * ROUNDS_PER_TURN * TURNS_PER_HOUR * HOURS_PER_DAY * DAYS_PER_WEEK;
      break;
    case 'Month':
      standardValue = value * ROUNDS_PER_TURN * TURNS_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH;
      break;
    case 'Year':
      standardValue =
        value * ROUNDS_PER_TURN * TURNS_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH * MONTHS_PER_YEAR;
      break;
  }

  return {
    type: 'Round',
    value: standardValue,
  };
};

// Process effects that expire with time
export const updateTimedEffects = (
  effects: TimedEffect[],
  _time: GameTime,
  amountAdvanced: number,
  unitAdvanced: TimeUnitType
): TimedEffect[] => {
  return effects.filter((effect) => {
    // Convert both the effect duration and the time advanced to a common unit (rounds)
    const effectDuration = standardizeDuration({
      value: effect.remaining.value,
      unit: effect.remaining.type,
    });

    const timeAdvanced = standardizeDuration({
      value: amountAdvanced,
      unit: unitAdvanced,
    });

    // If the effect would expire
    if (effectDuration.value <= timeAdvanced.value) {
      // Trigger the onExpire callback
      effect.onExpire();
      return false; // Remove from list
    }

    // Otherwise, reduce the remaining time
    effect.remaining = {
      type: effect.remaining.type,
      value:
        effect.remaining.value -
        timeAdvanced.value / standardizeDuration({ value: 1, unit: effect.remaining.type }).value,
    };

    return true; // Keep in list
  });
};

// Helper function to check if it's day or night
export const isDaylight = (phase: TimeOfDayPhase): boolean => {
  return ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk'].includes(phase);
};

// Calculate light conditions based on time of day
export const getLightLevel = (phase: TimeOfDayPhase): number => {
  switch (phase) {
    case 'Noon':
      return 10; // Full daylight
    case 'Morning':
    case 'Afternoon':
      return 9; // Bright daylight
    case 'Dawn':
    case 'Dusk':
      return 7; // Partial light
    case 'Evening':
      return 5; // Dim light
    case 'Midnight':
      return 2; // Very dark
    case 'DeepNight':
      return 1; // Almost pitch black
    default:
      return 8; // Default daylight
  }
};

// Get descriptive text for the current time
export const getTimeDescription = (time: GameTime): string => {
  const phase = determineTimeOfDayPhase(time.hours);
  const season = determineSeason(time.months);

  return (
    `It's ${phase.toLowerCase()} during ${season.toLowerCase()}. ` +
    `The time is approximately ${time.hours % 12 || 12}:${time.turns * 10 || '00'} ${time.hours >= 12 ? 'PM' : 'AM'}.`
  );
};

// Calculate weather effects based on season and time
export const getWeatherModifiers = (season: Season, phase: TimeOfDayPhase) => {
  const modifiers = {
    temperature: 0, // -10 to 10, 0 being moderate
    precipitation: 0, // 0 to 10, 0 being none
    wind: 0, // 0 to 10, 0 being none
    visibility: 10, // 0 to 10, 10 being perfect
  };

  // Season effects
  switch (season) {
    case 'Winter':
      modifiers.temperature -= 7;
      modifiers.precipitation += 4;
      modifiers.wind += 3;
      modifiers.visibility -= 2;
      break;
    case 'Spring':
      modifiers.temperature += 2;
      modifiers.precipitation += 5;
      modifiers.wind += 4;
      modifiers.visibility -= 1;
      break;
    case 'Summer':
      modifiers.temperature += 8;
      modifiers.precipitation += 2;
      modifiers.wind += 1;
      break;
    case 'Autumn':
      modifiers.temperature -= 2;
      modifiers.precipitation += 3;
      modifiers.wind += 5;
      modifiers.visibility -= 2;
      break;
  }

  // Time of day effects
  switch (phase) {
    case 'Dawn':
    case 'Dusk':
      modifiers.visibility -= 3;
      modifiers.temperature -= 2;
      break;
    case 'Noon':
      modifiers.temperature += 2;
      modifiers.visibility += 1;
      break;
    case 'Midnight':
    case 'DeepNight':
      modifiers.temperature -= 4;
      modifiers.visibility -= 6;
      break;
  }

  return modifiers;
};

// Get the duration in a human-readable format
export const formatDuration = (duration: TimeUnit): string => {
  switch (duration.type) {
    case 'Round':
      return `${duration.value} round${duration.value !== 1 ? 's' : ''}`;
    case 'Turn':
      return `${duration.value} turn${duration.value !== 1 ? 's' : ''}`;
    case 'Hour':
      return `${duration.value} hour${duration.value !== 1 ? 's' : ''}`;
    case 'Day':
      return `${duration.value} day${duration.value !== 1 ? 's' : ''}`;
    case 'Week':
      return `${duration.value} week${duration.value !== 1 ? 's' : ''}`;
    case 'Month':
      return `${duration.value} month${duration.value !== 1 ? 's' : ''}`;
    case 'Year':
      return `${duration.value} year${duration.value !== 1 ? 's' : ''}`;
    default:
      return `${duration.value} time units`;
  }
};
