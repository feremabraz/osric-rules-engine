# 8. Advanced Patterns

## Dynamic Command Execution
```ts
async function run(engine: Engine, key: string, params: unknown) {
  return engine.execute(key, params);
}
```
Useful when command key comes from configuration or scripting.

## Entity Snapshots for UI
Store a snapshot before and after commands to show diffs:
```ts
const before = engine.store.snapshot();
const res = await engine.command.inspireParty(leaderId, { bonus: 1, message: 'Go!' });
const after = engine.store.snapshot();
```

## Partial Feature Flags
Condition logic in your app based on `engine.getConfig().features` to show/hide UI modules.

## Battle Flow Example
```ts
const start = await engine.command.startBattle({ participants: [c1, c2], recordRolls: true });
if (start.ok) {
  const battleId = start.data.battleId;
  const atk = await engine.command.attackRoll({ target: c2, battleId });
  if (atk.ok && atk.data.hit) {
    await engine.command.dealDamage({ source: c1, target: c2, battleId, attackContext: { hit: atk.data.hit, natural: atk.data.natural } });
  }
  await engine.command.nextTurn({ battleId });
}
```
Effects for battle events are also mirrored into `battle.effectsLog` for domain replay.

End of usage guide.
