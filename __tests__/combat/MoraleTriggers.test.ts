import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import type { CharacterId } from '../../osric/store/ids';
import '../../osric/commands/createCharacter';
import '../../osric/commands/startBattle';
import '../../osric/commands/attackRoll';
import '../../osric/commands/dealDamage';
import '../../osric/commands/nextTurn';

// Tests morale triggers: firstBlood, allyDeath, scheduled re-check, and surrender margin (simulate via low rating & fearAura/outnumbered modifiers).

describe('Morale Triggers', () => {
  function getInvoke(engine: Engine) {
    return (
      engine as unknown as {
        command: Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
      }
    ).command;
  }
  async function createLowMorale(engine: Engine, name: string, morale = 2) {
    const { human, fighter } = engine.entities.character;
    const invoke = getInvoke(engine);
    const res = await invoke.createCharacter({ race: human, class: fighter, name });
    if (res.ok) {
      // directly lower morale by patching store
      const id = res.data.characterId as string;
      // Narrow id to CharacterId for store updates
      const charId = id as CharacterId;
      (
        engine.store.updateEntity as unknown as (
          t: 'character',
          id: CharacterId,
          patch: Record<string, unknown>
        ) => unknown
      )('character', charId, { moraleRating: morale });
      return charId;
    }
    throw new Error('create failed');
  }
  it('firstBlood triggers moraleCheck and schedules next', async () => {
    const engine = new Engine({ seed: 10 });
    await engine.start();
    const invoke = getInvoke(engine);
    const a = await createLowMorale(engine, 'Aggressor', 8);
    const b = await createLowMorale(engine, 'Victim', 7);
    const start = await invoke.startBattle({ participants: [a, b], recordRolls: true });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    // Force damage application to trigger firstBlood
    const atk = await invoke.attackRoll({ battleId, target: b });
    expect(atk.ok).toBe(true);
    const dmg = await invoke.dealDamage({
      source: a,
      target: b,
      battleId,
      attackContext: { hit: true },
    });
    expect(dmg.ok).toBe(true);
    const battle = engine.store.getBattle(battleId);
    expect(battle).not.toBeNull();
    const moraleEntries = battle?.effectsLog?.filter((e) => e.type === 'moraleCheck');
    expect((moraleEntries?.length || 0) >= 1).toBe(true);
  });
  it('allyDeath triggers moraleCheck on ally', async () => {
    const engine = new Engine({ seed: 11 });
    await engine.start();
    const invoke = getInvoke(engine);
    const a1 = await createLowMorale(engine, 'Ally1', 7);
    const a2 = await createLowMorale(engine, 'Ally2', 7);
    const foe = await createLowMorale(engine, 'Foe', 8);
    // Put allies in same faction
    const updateChar = engine.store.updateEntity as unknown as (
      t: 'character',
      id: CharacterId,
      patch: Record<string, unknown>
    ) => unknown;
    updateChar('character', a1, { faction: 'teamA' });
    updateChar('character', a2, { faction: 'teamA' });
    updateChar('character', foe, { faction: 'teamB' });
    const start = await invoke.startBattle({ participants: [a1, a2, foe], recordRolls: true });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    // Force low hp then deliver lethal damage to guarantee death trigger
    const updChar = engine.store.updateEntity as unknown as (
      t: 'character',
      id: CharacterId,
      patch: Record<string, unknown>
    ) => unknown;
    updChar('character', a1, { hp: 1 });
    // Boost foe strength to guarantee lethal damage
    updChar('character', foe, {
      ability: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    });
    await invoke.dealDamage({
      source: foe,
      target: a1,
      battleId,
      attackContext: { hit: true, critical: true, criticalMultiplier: 3 },
    });
    const deadChar = engine.store.getEntity('character', a1 as CharacterId);
    expect(!!deadChar && (deadChar.status?.dead === true || deadChar.hp < 0)).toBe(true);
    const battle = engine.store.getBattle(battleId);
    expect(battle).not.toBeNull();
    const moraleEntries = battle?.effectsLog?.filter(
      (e) => e.type === 'moraleCheck' && e.target === a2
    );
    expect((moraleEntries?.length || 0) >= 1).toBe(true);
  });
  it('scheduled morale re-check occurs after round advance', async () => {
    const engine = new Engine({ seed: 12 });
    await engine.start();
    const invoke = getInvoke(engine);
    const c1 = await createLowMorale(engine, 'C1', 8);
    const c2 = await createLowMorale(engine, 'C2', 8);
    const start = await invoke.startBattle({ participants: [c1, c2], recordRolls: true });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    // Deterministically schedule a morale check for c2 at next round (current is round 1)
    const battleBefore = engine.store.getBattle(battleId);
    expect(battleBefore?.round).toBe(1);
    const upd = engine.store.updateEntity as unknown as (
      t: 'character',
      id: CharacterId,
      patch: Record<string, unknown>
    ) => unknown;
    upd('character', c2 as CharacterId, { status: { nextMoraleCheckRound: 2 } });
    const initialChecks = 0;
    // Advance two turns to wrap to round 2 (two participants)
    await invoke.nextTurn({ battleId }); // activeIndex 1
    await invoke.nextTurn({ battleId }); // wrap -> round 2, scheduled morale should fire
    const battleAfter = engine.store.getBattle(battleId);
    expect(battleAfter?.round).toBe(2);
    const moraleChecks =
      battleAfter?.effectsLog?.filter((e) => e.type === 'moraleCheck' && e.target === c2) ?? [];
    expect(moraleChecks.length).toBeGreaterThan(initialChecks);
  });
  it('surrender outcome possible with large failure margin', async () => {
    const engine = new Engine({ seed: 13 });
    await engine.start();
    const invoke = getInvoke(engine);
    const low = await createLowMorale(engine, 'Low', 2); // very low morale rating
    const foe = await createLowMorale(engine, 'Foe', 12);
    const start = await invoke.startBattle({ participants: [low, foe], recordRolls: true });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    // Repeatedly damage low to drive morale failures (firstBlood then maybe half wounds) until surrender logged
    for (let i = 0; i < 8; i++) {
      await invoke.attackRoll({ battleId, target: low });
      await invoke.dealDamage({ source: foe, target: low, battleId, attackContext: { hit: true } });
      const battle = engine.store.getBattle(battleId);
      const surrenderEvent = battle?.effectsLog?.find(
        (e) =>
          e.type === 'moraleCheck' && (e.payload as { outcome?: string })?.outcome === 'surrender'
      );
      if (surrenderEvent) break;
    }
    const battle = engine.store.getBattle(battleId);
    const surrenderEvent = battle?.effectsLog?.find(
      (e) =>
        e.type === 'moraleCheck' && (e.payload as { outcome?: string })?.outcome === 'surrender'
    );
    expect(surrenderEvent).toBeTruthy();
  });
  it('effectsLog length grows with battle sequence events', async () => {
    const engine = new Engine({ seed: 14 });
    await engine.start();
    const invoke = getInvoke(engine);
    const a = await createLowMorale(engine, 'A', 9);
    const b = await createLowMorale(engine, 'B', 9);
    const start = await invoke.startBattle({ participants: [a, b], recordRolls: true });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    const initial = engine.store.getBattle(battleId)?.effectsLog?.length ?? 0;
    await invoke.attackRoll({ battleId, target: b }); // attack event
    await invoke.dealDamage({ source: a, target: b, battleId, attackContext: { hit: true } }); // damage + possible morale
    await invoke.nextTurn({ battleId }); // may schedule or fire morale
    const finalLen = engine.store.getBattle(battleId)?.effectsLog?.length ?? 0;
    expect(finalLen).toBeGreaterThan(initial);
  });
});
