import type { ZodTypeAny } from 'zod';
import { Command } from './Command';
import type { RuleSubclass } from './Rule';

// Factory to reduce boilerplate when authoring commands.

export const emptyOutput = Object.freeze({});

export interface DefineCommandInput<P extends ZodTypeAny> {
  key: string;
  params: P;
  rules: RuleSubclass[];
}

export function defineCommand<P extends ZodTypeAny>(
  cfg: DefineCommandInput<P>
): (new (
  raw: unknown
) => Command<P, Record<string, unknown>>) & {
  key: string;
  params: P;
  rules: RuleSubclass[];
} {
  const { key, params, rules } = cfg;
  if (!key || typeof key !== 'string') throw new Error('defineCommand: key must be non-empty');
  if (!params || typeof (params as unknown) !== 'object')
    throw new Error('defineCommand: params schema required');
  if (!Array.isArray(rules) || rules.length === 0)
    throw new Error('COMMAND_NO_RULES: defineCommand requires at least one rule');
  class DefinedCommand extends Command<P> {}
  (DefinedCommand as unknown as { key: string }).key = key;
  (DefinedCommand as unknown as { params: P }).params = params;
  (DefinedCommand as unknown as { rules: RuleSubclass[] }).rules = rules;
  return DefinedCommand as unknown as (new (
    raw: unknown
  ) => Command<P, Record<string, unknown>>) & {
    key: string;
    params: P;
    rules: RuleSubclass[];
  };
}
