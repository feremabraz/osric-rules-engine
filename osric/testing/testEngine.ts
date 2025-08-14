import type { CommandClass } from '../command/Command';
import { registerCommand, resetRegisteredCommands } from '../command/register';
// Phase 7: testEngine builder for ergonomic tests
import { Engine } from '../engine/Engine';
import type { CharacterDraft } from '../entities/character';
import { character } from '../entities/character';

export interface TestEngineOptions {
  seed?: number;
  rngOverride?: (rng: { setState(n: number): void; getState(): number }) => void;
}

export class TestEngineBuilder {
  private commands: CommandClass[] = [];
  private characters: { alias: string; draft: CharacterDraft }[] = [];
  constructor(private options: TestEngineOptions = {}) {}

  register(cmd: CommandClass): this {
    this.commands.push(cmd);
    return this;
  }

  withCharacter(
    alias: string,
    race: 'human' | 'dwarf',
    klass: 'fighter' | 'cleric',
    init: Partial<{ name: string }> & { name?: string }
  ): this {
    const name = init.name ?? alias;
    // Use legacy key-based mapping via character meta objects
    const raceMeta = race === 'human' ? character.human : character.dwarf;
    const classMeta = klass === 'fighter' ? character.fighter : character.cleric;
    const draft = character.prepare(raceMeta, classMeta, { name });
    this.characters.push({ alias, draft });
    return this;
  }

  finalize(): TestEngineInstance {
    resetRegisteredCommands();
    for (const c of this.commands) registerCommand(c);
    const engine = new Engine({ seed: this.options.seed });
    const characters = [...this.characters];
    const opts = this.options;
    return {
      engine,
      async start() {
        if (opts.rngOverride) {
          // @ts-ignore internal access to rng
          opts.rngOverride(
            (engine as unknown as { rng: { setState(n: number): void; getState(): number } }).rng
          );
        }
        await engine.start();
        const ids: Record<string, string> = {};
        for (const ch of characters) {
          const id = engine.store.setEntity('character', ch.draft);
          ids[ch.alias] = id;
        }
        return { ids };
      },
    };
  }
}

export interface TestEngineInstance {
  engine: Engine;
  start(): Promise<{ ids: Record<string, string> }>;
}

export function testEngine(options?: TestEngineOptions) {
  return new TestEngineBuilder(options);
}

// Event trace utilities
export function filterEvents(engine: Engine, command: string) {
  return engine.events.trace.filter((e) => e.command === command);
}
export function expectAllDurationsUnder(engine: Engine, ms: number) {
  for (const ev of engine.events.trace) {
    if (ev.durationMs > ms)
      throw new Error(`Event ${ev.command} exceeded ${ms}ms (got ${ev.durationMs})`);
  }
}

// Snapshot normalization (very lightweight)
export function normalizeSnapshot<T extends { createdAt?: number; updatedAt?: number }>(obj: T): T {
  const clone = { ...obj } as Record<string, unknown>;
  if (clone.createdAt) clone.createdAt = 0;
  if (clone.updatedAt) clone.updatedAt = 0;
  return clone as T;
}
