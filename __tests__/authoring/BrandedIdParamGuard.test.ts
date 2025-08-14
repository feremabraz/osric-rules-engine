import { describe, expect, it } from 'vitest';
import {
  getRegisteredCommands,
  registerCommand,
  resetRegisteredCommands,
} from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';
import {
  battleIdSchema,
  characterIdSchema,
  itemIdSchema,
  monsterIdSchema,
} from '../../osric/store/ids';

// Import a subset of commands to populate registry
import '../../osric/commands/createCharacter';
import '../../osric/commands/gainExperience';
import '../../osric/commands/inspireParty';
import '../../osric/commands/startBattle';
import '../../osric/commands/savingThrow';
import '../../osric/commands/attackRoll';
import '../../osric/commands/dealDamage';
import '../../osric/commands/nextTurn';

// Item 11: Authoring Consistency Guard
// Ensures command param schemas use branded ID schemas (characterIdSchema, etc.) rather than raw z.string for id fields.

describe('Authoring Guard: Branded ID schemas in command params', () => {
  it('all registered commands use branded schemas for known id param names', async () => {
    resetRegisteredCommands();
    // Re-register via side-effect imports (above)
    // (Imports already executed; but ensure commands are registered)
    const engine = new Engine({ autoDiscover: false });
    await engine.start();
    const cmds = getRegisteredCommands();
    const brandedSchemas: Set<unknown> = new Set([
      characterIdSchema,
      monsterIdSchema,
      itemIdSchema,
      battleIdSchema,
    ]);
    const idParamNames = [
      'characterId',
      'attacker',
      'target',
      'source',
      'battleId',
      'leader',
      'participants',
    ];
    const offenders: string[] = [];
    for (const cmd of cmds) {
      const schemaUnknown = (cmd as unknown as { params?: unknown }).params;
      if (!schemaUnknown || typeof schemaUnknown !== 'object') continue;
      const shape: Record<string, unknown> | undefined = (
        schemaUnknown as { shape?: Record<string, unknown> }
      ).shape;
      if (!shape) continue;
      for (const name of idParamNames) {
        if (Object.prototype.hasOwnProperty.call(shape, name)) {
          const value = shape[name];
          const unwrapped = unwrap(value);
          if (!brandedSchemas.has(unwrapped)) {
            offenders.push(`${(cmd as { key: string }).key}.${name}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

function unwrap(z: unknown): unknown {
  let cur: unknown = z;
  // Drill into known zod wrapper structure (best-effort, tolerant to shape changes)
  interface DefShape {
    _def?: { innerType?: unknown; type?: unknown };
  }
  while (cur && typeof cur === 'object') {
    const maybe = cur as DefShape;
    const inner = maybe._def?.innerType ?? maybe._def?.type;
    if (!inner) break;
    cur = inner;
  }
  return cur;
}
