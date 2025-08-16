import { describe, expect, it } from 'vitest';
import { DomainEngine } from '../../osric-engine/engine';
import { DomainMemoryStore } from '../../osric-engine/memoryStore';
import '../../osric-engine/commands/createCharacter';
import '../../osric-engine/commands/startBattle';

// We'll simulate a command producing battle: effects by manually crafting a success output via startBattle then mimicking effect injection.

// Patch store to inject a fake battle effect after startBattle by monkey patching command (simpler than redefining command logic for demo)
import { CommandRegistry } from '../../engine/facade/registry';

// Add a lightweight command that emits a battle effect
import { command } from '../../engine';
command('osric:emitBattleEffect')
  .mutate((_a, _p, ctx) => {
    (ctx as { effects: { add: (t: string, tar: string, p?: unknown) => void } }).effects.add(
      'battle:tick',
      'b1',
      { phase: 'setup' }
    );
    return {};
  })
  .emit(() => ({ done: true }));

describe('DE-06 effects mirroring', () => {
  it('mirrors unique battle effects on execute', () => {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store });
    engine.execute('osric:createCharacter', { id: 'c1', name: 'A' });
    engine.execute('osric:createCharacter', { id: 'c2', name: 'B' });
    engine.execute('osric:startBattle', { id: 'b1', participantIds: ['c1', 'c2'] });
    const res = engine.execute('osric:emitBattleEffect', {});
    expect(res.ok).toBe(true);
    if (res.ok) {
      const types = res.effects.map((e) => e.type);
      expect(types).toContain('battle:tick');
      expect(types).toContain('battle:tick:mirrored');
    }
  });

  it('does not duplicate mirrored effects across batch', () => {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store });
    engine.execute('osric:createCharacter', { id: 'c1', name: 'A' });
    engine.execute('osric:createCharacter', { id: 'c2', name: 'B' });
    engine.execute('osric:startBattle', { id: 'b1', participantIds: ['c1', 'c2'] });

    const batch = engine.batch(
      [
        { key: 'osric:emitBattleEffect', params: {} },
        { key: 'osric:emitBattleEffect', params: {} }, // same effect second time
      ],
      { atomic: false }
    );

    const mirroredCount = batch.effects.filter((e) => e.type.endsWith(':mirrored')).length;
    expect(mirroredCount).toBe(1); // unique payload ensures only one mirrored
  });
});
