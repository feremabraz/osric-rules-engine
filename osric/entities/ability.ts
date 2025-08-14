// Phase 01 Item 1: Ability Score Generation Service
import type { Rng } from '../rng/random';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}
export type AbilityScoreMethod = 'STANDARD_3D6' | 'FOCUSED_4D6_DROP_LOWEST' | 'HEROIC_2D6_PLUS_6';

export function rollAbilityScores(method: AbilityScoreMethod, rng: Rng): AbilityScores {
  switch (method) {
    case 'STANDARD_3D6':
      return six(() => rollND6(rng, 3));
    case 'FOCUSED_4D6_DROP_LOWEST':
      return six(() => roll4d6DropLowest(rng));
    case 'HEROIC_2D6_PLUS_6':
      return six(() => 6 + rollND6(rng, 2));
    default: {
      // Exhaustive check
      const _m: never = method; // eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error(`Unsupported ability score method ${method as string}`);
    }
  }
}

function six(gen: () => number): AbilityScores {
  return { str: gen(), dex: gen(), con: gen(), int: gen(), wis: gen(), cha: gen() };
}

function rollND6(rng: Rng, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += rng.int(1, 6);
  return total;
}

function roll4d6DropLowest(rng: Rng): number {
  const rolls = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

export function validateAbilityScores(scores: AbilityScores, method: AbilityScoreMethod): void {
  const min = method === 'HEROIC_2D6_PLUS_6' ? 8 : 3;
  for (const v of Object.values(scores)) {
    if (v < min || v > 18) throw new Error('ENGINE_INVARIANT: ability score out of bounds');
  }
}

// OSRIC-style ability modifier table (simplified classic ranges)
export function abilityMod(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3; // 18+
}
