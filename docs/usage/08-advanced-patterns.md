# 8. Advanced Patterns

## Dynamic Command Execution
```ts
async function run(engine: Engine, key: string, params: unknown) {
  return engine.execute(key, params);
}
```
Useful when command key comes from configuration or scripting.

## Batching (Manual)
Currently there's no built-in batch operation. You can serialize calls:
```ts
const results = [];
for (const spec of queue) {
  results.push(await engine.execute(spec.key, spec.params));
}
```
Future enhancements may introduce transactional batches.

## Entity Snapshots for UI
Store a snapshot before and after commands to show diffs:
```ts
const before = engine.store.snapshot();
const res = await engine.command.inspireParty(leaderId, { bonus: 1, message: 'Go!' });
const after = engine.store.snapshot();
```

## Partial Feature Flags
Condition logic in your app based on `engine.getConfig().features` to show/hide UI modules.

End of usage guide.
