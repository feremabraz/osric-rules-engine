// We purposely allow structural classes (not forced inheritance)
// so that tests and lightweight command author files can inline anonymous classes without
// extending this base. Any class with the static metadata + instance apply function qualifies.

export abstract class Rule<Delta extends Record<string, unknown> = Record<string, unknown>> {
  static ruleName: string;
  static after?: string[];
  static produces?: readonly string[];
  abstract apply(ctx: unknown): Promise<Delta | undefined> | Delta | undefined;
}

// Structural rule class contract accepted by the registry.

export interface RuleClass {
  new (): { apply: (ctx: unknown) => unknown };
  ruleName: string;
  after?: string[];
  produces?: readonly string[];
  // Explicit output schema required for all rules.
  output: import('zod').ZodObject<Record<string, import('zod').ZodTypeAny>>;
}

export type RuleSubclass = RuleClass;
