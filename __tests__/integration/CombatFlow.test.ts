import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/attackRoll';
import '../../osric/commands/dealDamage';

// Phase 02 integration: attack then conditional damage

describe('Combat Flow (Phase 02)', () => {
  it('attack then deal damage path emits damageApplied effect when hit', async () => {
    const engine = new Engine({ seed: 123 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<unknown>> }
    ).command;
    const aRes = (await invoke.createCharacter({
      race: human,
      class: fighter,
      name: 'Attacker',
    })) as Result<Record<string, unknown>>;
    const bRes = (await invoke.createCharacter({
      race: human,
      class: fighter,
      name: 'Target',
    })) as Result<Record<string, unknown>>;
    expect(aRes.ok && bRes.ok).toBe(true);
    if (!aRes.ok || !bRes.ok) return; // early abort if creation failed
    const attackerId = aRes.data.characterId as string;
    const targetId = bRes.data.characterId as string;
    const atk = (await invoke.attackRoll({ attacker: attackerId, target: targetId })) as Result<
      Record<string, unknown>
    >;
    expect(atk.ok).toBe(true);
    if (!atk.ok) return;
    if (atk.data.hit === true) {
      const dmg = (await invoke.dealDamage({
        source: attackerId,
        target: targetId,
        attackContext: { hit: true },
      })) as Result<Record<string, unknown>>;
      expect(dmg.ok).toBe(true);
      if (dmg.ok) {
        const effectLog = engine.events.effects;
        const found = effectLog.find((e) => e.command === 'dealDamage');
        expect(found?.effects.some((e) => e.type === 'damageApplied')).toBe(true);
      }
    } else {
      const dmgFail = (await invoke.dealDamage({
        source: attackerId,
        target: targetId,
        attackContext: { hit: false },
      })) as Result<Record<string, unknown>>;
      expect(dmgFail.ok).toBe(false);
    }
  });
});
