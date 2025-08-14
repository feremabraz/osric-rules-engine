import type { ZodTypeAny } from 'zod';
import type { z } from 'zod';
import type { RuleSubclass } from './Rule';

export abstract class Command<
  P extends ZodTypeAny = ZodTypeAny,
  _R extends Record<string, unknown> = Record<string, unknown>,
> {
  static key: string;
  static params: ZodTypeAny;
  static rules: RuleSubclass[];
  readonly params: z.infer<P>;
  constructor(raw: unknown) {
    const ctor = this.constructor as typeof Command & { params: ZodTypeAny };
    if (!ctor.params) throw new Error(`Command ${ctor.name} missing static params`);
    this.params = ctor.params.parse(raw) as z.infer<P>;
  }
}

export type CommandClass = (abstract new (
  raw: unknown
) => Command<ZodTypeAny, Record<string, unknown>>) & {
  key: string;
  params: ZodTypeAny;
  rules: RuleSubclass[];
};
