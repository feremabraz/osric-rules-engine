import type { Engine } from '../engine/Engine';
import type { CharacterId } from '../store/ids';
import type { Result } from '../types/result';
import { assertOk } from '../types/result';

// Await (or accept) a Result and return the ok data (throws if failure)
export async function testExpectOk<T>(resOrPromise: Result<T> | Promise<Result<T>>): Promise<T> {
  const r = await resOrPromise;
  return assertOk(r);
}

interface FastCharacterOptions {
  name?: string;
}

// Create a baseline character for testing, returning its ID
export async function baselineCharacter(
  engine: Engine,
  opts: FastCharacterOptions = {}
): Promise<CharacterId> {
  const { name = 'TestChar' } = opts;
  const { human, fighter } = engine.entities.character as Record<string, unknown> & {
    human: unknown;
    fighter: unknown;
  };
  const invoke = (
    engine as unknown as {
      command: Record<
        string,
        (p: Record<string, unknown>) => Promise<Result<Record<string, unknown>>>
      >;
    }
  ).command;
  const res = (await invoke.createCharacter({ race: human, class: fighter, name })) as Result<{
    characterId: CharacterId;
  }>;
  const data = assertOk(res);
  return data.characterId as CharacterId;
}

// Snapshot the world (store snapshot) for snapshot tests / assertions
export function snapshotWorld(engine: Engine) {
  return engine.store.snapshot();
}
