import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine, simulate } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

// Reuse an actual existing command from codebase: createCharacter (import triggers registration via side-effect)
import '../../osric/commands/createCharacter';

// Purpose-built failing command for domain failure diagnostics
class FailingDomainCommand extends Command {
  static key = 'failingDomain';
  static params = z.object({});
  static rules = [
    class DomainFailRule {
      static ruleName = 'domainFail';
      static output = z.object({});
      async apply() {
        return { __fail: true, code: 'DOMAIN_UNKNOWN', message: 'boom' };
      }
    },
  ];
}

describe('simulate (public helper)', () => {
  it('returns diff and leaves state unchanged on success (createCharacter)', async () => {
    resetRegisteredCommands();
    // Re-register createCharacter
    // Dynamic import already done; register explicitly to ensure registry state
    // Extract the class from module cache
    const mod = await import('../../osric/commands/createCharacter');
    registerCommand(mod.CreateCharacterCommand);
    const engine = new Engine();
    await engine.start();
    const snapBefore = engine.store.snapshot();
    // Use canonical frozen meta objects exposed via public entities facade
    const { human, fighter } = engine.entities.character;
    const sim = await simulate(engine, 'createCharacter', {
      name: 'Alice',
      race: human,
      class: fighter,
    });
    const snapAfter = engine.store.snapshot();
    expect(sim.result.ok).toBe(true);
    // Store state after simulation must match pre-simulation snapshot (rollback)
    expect(snapAfter).toEqual(snapBefore);
    // Diff should reflect the transient creation of exactly one character entity
    expect(sim.diff.created.length).toBe(1);
    expect(sim.diff.mutated.length).toBe(0);
    expect(sim.diff.deleted.length).toBe(0);
  });

  it('captures domain failure with failedRule diagnostics', async () => {
    resetRegisteredCommands();
    registerCommand(FailingDomainCommand);
    const engine = new Engine();
    await engine.start();
    const sim = await simulate(engine, 'failingDomain', {});
    expect(sim.result.ok).toBe(false);
    const diag = sim.diagnostics as { failedRule?: string } | undefined;
    expect(diag?.failedRule).toBe('domainFail');
  });

  it('returns PARAM_INVALID structural failure without diff changes', async () => {
    resetRegisteredCommands();
    const mod = await import('../../osric/commands/createCharacter');
    registerCommand(mod.CreateCharacterCommand);
    const engine = new Engine();
    await engine.start();
    const before = engine.store.snapshot();
    const sim = await simulate(engine, 'createCharacter', {
      // Invalid: name empty triggers schema failure
      name: '',
      // Provide obviously wrong race/class shapes (missing required meta fields)
      race: { bogus: true },
      class: { bogus: true },
    });
    const after = engine.store.snapshot();
    expect(sim.result.ok).toBe(false);
    // Structural (param) failure happens before any rule execution, so no diff
    expect(sim.diff.created.length).toBe(0);
    expect(sim.diff.mutated.length).toBe(0);
    expect(sim.diff.deleted.length).toBe(0);
    expect(after).toEqual(before);
    // Diagnostics for param parse failures are embedded in result message (no failedRule)
    const diag = sim.diagnostics as { failedRule?: string } | undefined;
    expect(diag?.failedRule).toBeUndefined();
  });
});
