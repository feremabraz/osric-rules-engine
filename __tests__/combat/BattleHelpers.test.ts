import { describe, expect, it } from 'vitest';
import { Engine, type Result, activeCombatant, getBattle, listBattleOrder } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/startBattle';
import '../../osric/commands/nextTurn';

// Phase 06 Item 6: Battle convenience helpers tests

describe('Battle helpers', () => {
  it('getBattle, listBattleOrder, activeCombatant work', async () => {
    const engine = new Engine({ seed: 101 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type GenericRes = Result<Record<string, unknown>>;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<GenericRes>> }
    ).command;
    const a = await invoke.createCharacter({ race: human, class: fighter, name: 'A' });
    const b = await invoke.createCharacter({ race: human, class: fighter, name: 'B' });
    if (!a.ok || !b.ok) throw new Error('char create');
    const start = await invoke.startBattle({
      participants: [a.data.characterId, b.data.characterId],
    });
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const battleId = start.data.battleId as string;
    const battle = getBattle(engine, battleId);
    expect(battle?.id).toBe(battleId);
    const order = listBattleOrder(engine, battleId);
    expect(order.length).toBe(2);
    const active = activeCombatant(engine, battleId);
    expect(active === null ? false : order.includes(active)).toBe(true);
    await invoke.nextTurn({ battleId });
    const active2 = activeCombatant(engine, battleId);
    expect(active2).not.toBeNull();
    expect(active2).not.toBe(active);
  });
});
