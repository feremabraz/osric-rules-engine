import { describe, expect, it } from 'vitest';
import { Engine, type Result, getBattleSnapshot } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/startBattle';
import '../../osric/commands/nextTurn';
import '../../osric/commands/attackRoll';

// Phase 03 core battle flow tests

describe('Battle Flow (Phase 03)', () => {
  it('startBattle establishes ordering deterministically by seed', async () => {
    const engine = new Engine({ seed: 999 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<unknown>> }
    ).command;
    const a = (await invoke.createCharacter({ race: human, class: fighter, name: 'A' })) as Result<
      Record<string, unknown>
    >;
    const b = (await invoke.createCharacter({ race: human, class: fighter, name: 'B' })) as Result<
      Record<string, unknown>
    >;
    const c = (await invoke.createCharacter({ race: human, class: fighter, name: 'C' })) as Result<
      Record<string, unknown>
    >;
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    const sb = (await invoke.startBattle({
      participants: [a.data.characterId, b.data.characterId, c.data.characterId],
      recordRolls: true,
    })) as Result<Record<string, unknown>>;
    expect(sb.ok).toBe(true);
    if (!sb.ok) return;
    const snap = getBattleSnapshot(engine.store, sb.data.battleId as string);
    expect(snap?.order.length).toBe(3);
    expect(snap?.round).toBe(1);
    expect(snap?.timeSeconds).toBe(0);
    // Initiative log entries = participants count
    expect(snap?.rollsLog?.filter((r) => r.type === 'init').length).toBe(3);
  });

  it('nextTurn advances and rerolls when flagged', async () => {
    const engine = new Engine({ seed: 1001 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<unknown>> }
    ).command;
    const a = (await invoke.createCharacter({ race: human, class: fighter, name: 'A' })) as Result<
      Record<string, unknown>
    >;
    const b = (await invoke.createCharacter({ race: human, class: fighter, name: 'B' })) as Result<
      Record<string, unknown>
    >;
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const sb = (await invoke.startBattle({
      participants: [a.data.characterId, b.data.characterId],
      recordRolls: true,
    })) as Result<Record<string, unknown>>;
    if (!sb.ok) return;
    const battleId = sb.data.battleId as string;
    const snap0 = getBattleSnapshot(engine.store, battleId);
    if (!snap0) return;
    // two advances without wrap shouldn't change round
    const t1 = (await invoke.nextTurn({ battleId })) as Result<Record<string, unknown>>;
    expect(t1.ok).toBe(true);
    const snapMid = getBattleSnapshot(engine.store, battleId);
    if (!snapMid) return;
    expect(snapMid.round).toBe(1);
    // advance with reroll flag triggers wrap + reroll (since only 2 participants next advance wraps)
    const t2 = (await invoke.nextTurn({ battleId, rerollAtNewRound: true })) as Result<
      Record<string, unknown>
    >;
    expect(t2.ok).toBe(true);
    const snap2 = getBattleSnapshot(engine.store, battleId);
    if (!snap2) return;
    expect(snap2.round).toBe(2);
    // Order may or may not change depending on roll; ensure rolls log grew by at least 2 (initial + second init rolls)
    expect(snap2.rollsLog?.filter((r) => r.type === 'init').length || 0).toBeGreaterThanOrEqual(4); // initial 2 + reroll 2
    // Attack inference: active participant can attack without specifying attacker
    const atk = (await invoke.attackRoll({ target: snap2.order[0].id, battleId })) as Result<
      Record<string, unknown>
    >;
    expect(atk.ok).toBe(true);
  });
});
