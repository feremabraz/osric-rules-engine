// CE-07 Integrity Guard Hashing
// Provides stable hashing for the accumulator to detect unintended mutations.
// Not wired into executor yet (that occurs in CE-08).

import { hashValue } from './hash';

export type IntegrityHash = bigint;

export function computeHash(acc: unknown): IntegrityHash {
  return hashValue(acc);
}

export function verifyHash(expected: IntegrityHash, acc: unknown): boolean {
  return expected === computeHash(acc);
}
