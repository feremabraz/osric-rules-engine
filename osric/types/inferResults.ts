import type { z } from 'zod';

// Utility: Convert a union of objects into an intersection (merge fields)
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Derive the object shape (runtime types) from a rule class with static output schema
export type RuleOutputShape<R> = R extends { output: z.ZodObject<infer S extends z.ZodRawShape> }
  ? { [K in keyof S]: z.infer<S[K]> }
  : Record<string, never>;

// Merge all rule output shapes for a rules tuple/array
export type MergeRuleOutputs<Rules extends readonly unknown[]> = UnionToIntersection<
  RuleOutputShape<Rules[number]>
>;

// Derive command result object type from the static rules array
// Accept either mutable or readonly rules arrays for inference.
export type CommandResultFrom<C> = C extends { rules: (infer Rs)[] }
  ? MergeRuleOutputs<readonly Rs[]>
  : C extends { rules: readonly (infer Rs2)[] }
    ? MergeRuleOutputs<readonly Rs2[]>
    : Record<string, never>;
