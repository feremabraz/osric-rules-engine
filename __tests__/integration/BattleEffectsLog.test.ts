import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/startBattle';
import '../../osric/commands/attackRoll';
import '../../osric/commands/dealDamage';
import '../../osric/commands/nextTurn';

// Integration: verify effectsLog captures attackRoll and damage + morale entries.

describe('Battle effectsLog integration', () => {
  it('records attackRoll and damageApplied effects', async () => {
    const engine = new Engine({ seed: 42 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type GenericResult = Result<Record<string, unknown>>;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<GenericResult>> }
    ).command;
    const aRes = await invoke.createCharacter({ race: human, class: fighter, name: 'A' });
    const bRes = await invoke.createCharacter({ race: human, class: fighter, name: 'B' });
    expect(aRes.ok && bRes.ok).toBe(true);
    if (!aRes.ok || !bRes.ok) return;
    const attacker = aRes.data.characterId;
    const defender = bRes.data.characterId;
    const start = await invoke.startBattle({
      participants: [attacker, defender],
      recordRolls: true,
    });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId;
    // Force attacker by using battle active combatant (seed deterministic)
    const atk = await invoke.attackRoll({ battleId, target: defender });
    expect(atk.ok).toBe(true);
    if (!atk.ok) return;
    // Always apply damage using forced hit context to exercise damage effect logging
    const dmg = await invoke.dealDamage({
      source: attacker,
      target: defender,
      battleId,
      attackContext: { hit: true },
    });
    expect(dmg.ok).toBe(true);
    const battle = engine.store.getBattle(battleId as string);
    expect(battle?.effectsLog?.some((e) => e.type === 'attackRoll')).toBe(true);
    expect(battle?.effectsLog?.some((e) => e.type === 'damageApplied')).toBe(true);
  });
});
