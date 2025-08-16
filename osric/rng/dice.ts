import type { Rng } from './random';

// RNG & Dice Utilities

export function rollDie(rng: Rng, sides: number): number {
  if (sides < 2) return 1;
  return rng.int(1, sides);
}

export interface DiceSpec {
  count: number; // number of dice
  sides: number; // sides per die
  bonus?: number; // flat modifier
}

export interface RollDiceResult {
  total: number;
  rolls: number[];
  bonus: number;
}

export function rollDice(rng: Rng, spec: DiceSpec): RollDiceResult {
  const { count, sides, bonus = 0 } = spec;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(rng, sides));
  const total = rolls.reduce((a, b) => a + b, 0) + bonus;
  return { total, rolls, bonus };
}

// Temporarily fork rng state, run fn with cloned rng seeded then restore original state.
export function withTempSeed<T>(rng: Rng, seed: number, fn: (r: Rng) => T): T {
  const original = rng.getState();
  rng.setState(seed >>> 0);
  try {
    return fn(rng);
  } finally {
    rng.setState(original);
  }
}
