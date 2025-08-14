// Morale system implementation (formalized beyond placeholder)
// Based on provided design: 2d6 <= moraleRating succeeds; modifiers apply; failure margin drives outcome.

import { z } from 'zod';
import type { Character } from '../entities/character';
import { rollDie } from '../rng/dice';
import type { Rng } from '../rng/random';

export type MoraleOutcome = 'hold' | 'fallBack' | 'flee' | 'surrender';

export interface MoraleContext {
  trigger: 'firstBlood' | 'woundedHalf' | 'allyDeath' | 'leaderDeath' | 'scheduled' | 'manual';
  leaderAlive?: boolean;
  outnumberedRatio?: number;
  fearAura?: boolean;
  recentVictory?: boolean;
  surrounded?: boolean;
  forced?: boolean;
  leaderDead?: boolean;
}

export interface MoraleCheckResult {
  success: boolean;
  roll: number; // total after modifiers
  raw: number; // raw 2d6
  target: number; // morale rating threshold
  modifiers: number;
  margin: number; // target - roll (positive if success, negative if failure)
  outcome: MoraleOutcome;
  nextCheckInRounds?: number; // schedule suggestion
  modifiersApplied: { key: string; value: number }[];
}

export const MoraleContextSchema = z.object({
  trigger: z.enum(['firstBlood', 'woundedHalf', 'allyDeath', 'leaderDeath', 'scheduled', 'manual']),
  leaderAlive: z.boolean().optional(),
  outnumberedRatio: z.number().positive().optional(),
  fearAura: z.boolean().optional(),
  recentVictory: z.boolean().optional(),
  surrounded: z.boolean().optional(),
  forced: z.boolean().optional(),
  leaderDead: z.boolean().optional(),
});

export function performMoraleCheck(
  entity: Character,
  ctx: MoraleContext,
  rng: Rng
): MoraleCheckResult {
  // Immunities
  // (Future: immunity checks could short-circuit here.)
  const rating = entity.moraleRating ?? 10;
  // Roll 2d6
  const d1 = rollDie(rng, 6);
  const d2 = rollDie(rng, 6);
  const raw = d1 + d2;
  let modifiers = 0;
  const modifiersApplied: { key: string; value: number }[] = [];
  // Positive modifier makes failure more likely (added to roll). Use spec mapping.
  if (ctx.leaderAlive) {
    modifiers -= 1;
    modifiersApplied.push({ key: 'leaderAlive', value: -1 });
  }
  if (ctx.recentVictory) {
    modifiers -= 1;
    modifiersApplied.push({ key: 'recentVictory', value: -1 });
  }
  if (ctx.fearAura) {
    modifiers += 2;
    modifiersApplied.push({ key: 'fearAura', value: 2 });
  }
  if (ctx.outnumberedRatio) {
    if (ctx.outnumberedRatio >= 3) {
      modifiers += 2;
      modifiersApplied.push({ key: 'outnumbered3to1', value: 2 });
    } else if (ctx.outnumberedRatio >= 2) {
      modifiers += 1;
      modifiersApplied.push({ key: 'outnumbered2to1', value: 1 });
    }
  }
  if (ctx.leaderDead) {
    modifiers += 2;
    modifiersApplied.push({ key: 'leaderDead', value: 2 });
  }
  const roll = raw + modifiers;
  const success = roll <= rating; // lower or equal passes (2d6 bell curve)
  const margin = rating - roll; // negative => failure by |margin|
  let outcome: MoraleOutcome = 'hold';
  if (!success) {
    const failureMagnitude = -margin; // positive number
    if (ctx.surrounded) outcome = 'surrender';
    else if (failureMagnitude >= 5) outcome = 'surrender';
    else if (failureMagnitude >= 3) outcome = 'flee';
    else outcome = 'fallBack';
  }
  let nextCheckInRounds: number | undefined;
  if (success && ctx.trigger === 'woundedHalf') nextCheckInRounds = 2;
  if (!success) nextCheckInRounds = 2;
  return {
    success,
    roll,
    raw,
    target: rating,
    modifiers,
    margin,
    outcome,
    nextCheckInRounds,
    modifiersApplied,
  };
}

export function moraleOutcomeToState(outcome: MoraleOutcome) {
  return outcome;
}
