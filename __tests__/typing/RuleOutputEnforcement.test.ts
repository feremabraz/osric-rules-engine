import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
// Import each command module explicitly
import * as attackRoll from '../../osric/commands/attackRoll';
import * as createCharacter from '../../osric/commands/createCharacter';
import * as dealDamage from '../../osric/commands/dealDamage';
import * as gainExperience from '../../osric/commands/gainExperience';
import * as inspireParty from '../../osric/commands/inspireParty';
import * as nextTurn from '../../osric/commands/nextTurn';
import * as savingThrow from '../../osric/commands/savingThrow';
import * as startBattle from '../../osric/commands/startBattle';

const modules = [
  attackRoll,
  createCharacter,
  dealDamage,
  gainExperience,
  inspireParty,
  nextTurn,
  savingThrow,
  startBattle,
];

interface CommandLike {
  key: string;
  rules: RuleLike[];
}
interface RuleLike {
  ruleName?: string;
  output?: z.ZodTypeAny;
}
function isCommandClass(v: unknown): v is CommandLike {
  if (!v || typeof v !== 'function') return false;
  const maybe = v as { key?: unknown; rules?: unknown };
  return typeof maybe.key === 'string' && Array.isArray(maybe.rules);
}
function getRules(cmd: CommandLike): RuleLike[] {
  return (cmd as unknown as { rules: unknown[] }).rules.filter(
    (r) => typeof r === 'function' || typeof r === 'object'
  ) as RuleLike[];
}

describe('Rule output schemas hardened (no direct z.any outputs)', () => {
  const all: CommandLike[] = [];
  for (const m of modules) {
    for (const value of Object.values(m)) if (isCommandClass(value)) all.push(value);
  }
  it('every rule output is not plain z.any()', () => {
    for (const cmd of all) {
      for (const rule of getRules(cmd)) {
        const output = rule.output;
        expect(
          output,
          `Rule ${rule.ruleName ?? '(unnamed)'} of command ${cmd.key} missing static output schema`
        ).toBeTruthy();
        if (!output) continue;
        // Access internal _def safely via index signature to avoid any cast
        const internal = output as unknown as { _def?: { typeName?: string } };
        const typeName = internal._def?.typeName;
        expect(typeName).not.toBe('ZodAny');
      }
    }
  });
});
