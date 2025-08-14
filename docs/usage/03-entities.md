# 3. Working With Entities

## Character Draft
```ts
const draft = engine.entities.character.prepare(engine.entities.character.human, engine.entities.character.fighter, { name: 'Cade' });
const charId = engine.store.setEntity('character', draft);
```

## Updating
```ts
engine.store.updateEntity('character', charId, { hp: 9 });
```

## Monster & Item
```ts
const monsterDraft = engine.entities.monster.prepare({ name: 'Goblin', level: 1, hp: 5 });
const monsterId = engine.store.setEntity('monster', monsterDraft);

const itemDraft = engine.entities.item.prepare({ name: 'Lantern', kind: 'gear' });
const itemId = engine.store.setEntity('item', itemDraft);
```

## Snapshot
```ts
const world = engine.store.snapshot();
```

Next: Executing Commands (4).
