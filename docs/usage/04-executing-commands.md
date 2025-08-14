# 4. Executing Commands

Commands expose ergonomic methods under `engine.command`.

## Positional Sugar
If a command's first schema fields are primitive/ID-like, you can pass them positionally:
```ts
await engine.command.gainExperience(charId, { amount: 500 }); // maps charId -> characterId field
```
You can always pass a single object instead:
```ts
await engine.command.gainExperience({ characterId: charId, amount: 500 });
```

## Result Handling
```ts
const res = await engine.command.inspireParty(charId, { bonus: 2, message: 'Charge!' });
if (res.ok) {
  console.log(res.data.durationRounds);
} else if (res.kind === 'domain') {
  // user-level error like NO_LEADER
} else {
  // engine structural error
}
```

## Accessing Effects
After a successful command:
```ts
console.log(engine.events.effects);
```
Each entry includes `{ command, effects: [{ type, target, payload? }] }`.

Next: Error Handling Patterns (5).
