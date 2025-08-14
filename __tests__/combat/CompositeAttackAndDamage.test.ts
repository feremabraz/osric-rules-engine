import { describe, expect, it } from 'vitest';
import { Engine, type Result, applyAttackAndDamage } from '../../osric';
import type { CharacterId } from '../../osric/store/ids';
import '../../osric/commands/createCharacter';
import '../../osric/commands/startBattle';
import '../../osric/commands/attackRoll';
import '../../osric/commands/dealDamage';

// Phase 06 Item 7: Composite attack + damage helper parity test

describe('applyAttackAndDamage helper', () => {
  it('matches manual attack + damage sequence when hit', async () => {
    const engine = new Engine({ seed: 777 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as {
        command: Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
      }
    ).command;
    const a = (await invoke.createCharacter({ race: human, class: fighter, name: 'A' })) as Result<
      Record<string, unknown>
    >;
    const b = (await invoke.createCharacter({ race: human, class: fighter, name: 'B' })) as Result<
      Record<string, unknown>
    >;
    if (!a.ok || !b.ok) throw new Error('char creation failed');
    const sb = (await invoke.startBattle({
      participants: [a.data.characterId, b.data.characterId],
    })) as Result<Record<string, unknown>>;
    if (!sb.ok) throw new Error('battle start failed');
    const battleId = sb.data.battleId as string;

    // Manual sequence
    interface AttackData {
      hit?: boolean;
      attacker?: { id: CharacterId };
      natural?: number;
      critical?: boolean;
      criticalMultiplier?: number;
    }
    const atk = (await invoke.attackRoll({
      battleId,
      target: b.data.characterId as CharacterId,
    })) as Result<AttackData>;
    expect(atk.ok).toBe(true);
    if (!atk.ok) return; // stop if failed attack
    const attackHit = atk.data.hit === true;
    let manualDamage: Result<Record<string, unknown>> | null = null;
    if (attackHit) {
      manualDamage = (await invoke.dealDamage({
        source: atk.data.attacker?.id as CharacterId,
        target: b.data.characterId as CharacterId,
        battleId,
        attackContext: {
          hit: true,
          natural: atk.data.natural,
          critical: atk.data.critical,
          criticalMultiplier: atk.data.criticalMultiplier,
        },
      })) as Result<Record<string, unknown>>;
      expect(manualDamage.ok).toBe(true);
    }

    // Composite helper
    const combined = await applyAttackAndDamage({
      engine,
      battleId,
      target: b.data.characterId as CharacterId,
    });
    // The helper should mirror manual outcome when hit. If manual predicted hit, combined must include damage.
    if (attackHit) {
      expect(combined.kind).toBe('attackAndDamage');
      if (combined.kind === 'attackAndDamage') {
        const aRes = combined.attack as Result<AttackData>;
        const dRes = combined.damage as Result<Record<string, unknown>>;
        expect(aRes.ok && dRes.ok).toBe(true);
      }
    }
  });
});
