import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CommandClass } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';
import type { CharacterId } from '../../osric/store/ids';
import type { BattleState } from '../../osric/store/storeFacade';

// Simple command that emits an effect on provided target id.
class EmitEffect extends Rule<Record<string, never>> {
  static ruleName = 'EmitEffect';
  static output = z.object({});
  apply(ctx: unknown) {
    const c = ctx as {
      effects: { add: (t: string, id: string, p?: unknown) => void };
      params: { targetId: string };
    };
    c.effects.add('buff', c.params.targetId, { val: 1 });
    return {};
  }
}
(EmitEffect as unknown as { category?: string }).category = 'emit';

const Cmd = defineCommand({
  key: 'EmitBuff',
  params: z.object({ targetId: z.string() }),
  rules: [EmitEffect],
});

function setupBattle(engine: Engine, participant: string) {
  const battle: BattleState = {
    id: 'b1',
    round: 1,
    timeSeconds: 0,
    order: [{ id: participant as unknown as CharacterId, rolled: 10 }],
    activeIndex: 0,
  };
  engine.store.setBattle(battle);
}

describe('Effects Mirroring (Item 12)', () => {
  beforeEach(() => {
    resetRegisteredCommands();
  });

  it('mirrors participant-targeted effect into battle log once', async () => {
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const draft = engine.entities.character.prepare(
      engine.entities.character.human,
      engine.entities.character.fighter,
      { name: 'A' }
    );
    const charId = engine.store.setEntity('character', draft);
    setupBattle(engine, charId);
    const res = await engine.execute('EmitBuff', { targetId: charId });
    expect(res.ok).toBe(true);
    const battle = engine.store.getBattle('b1');
    expect(battle?.effectsLog?.length).toBe(1);
    expect(battle?.effectsLog?.[0].type).toBe('buff');
  });

  it('dedupes identical effect same round', async () => {
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const draft = engine.entities.character.prepare(
      engine.entities.character.human,
      engine.entities.character.fighter,
      { name: 'B' }
    );
    const charId = engine.store.setEntity('character', draft);
    setupBattle(engine, charId);
    await engine.execute('EmitBuff', { targetId: charId });
    await engine.execute('EmitBuff', { targetId: charId });
    const battle = engine.store.getBattle('b1');
    expect(battle?.effectsLog?.length).toBe(1);
  });

  it('does not mirror effect when target not in battle', async () => {
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const draft = engine.entities.character.prepare(
      engine.entities.character.human,
      engine.entities.character.fighter,
      { name: 'C' }
    );
    const charId = engine.store.setEntity('character', draft);
    // no battle setup
    await engine.execute('EmitBuff', { targetId: charId });
    const snapshot = engine.store.snapshot();
    const battle = snapshot.battles.find((b) => b.id === 'b1');
    expect(battle).toBeUndefined();
  });
});
