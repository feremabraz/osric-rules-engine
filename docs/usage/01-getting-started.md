# 1. Getting Started

A quick guide for application developers consuming the OSRIC Engine. For conceptual background see `../concepts`.

## Install
(Assuming published package name `@osric`.)
```ts
import { Engine } from '@osric';
```

## Basic Boot
```ts
const engine = new Engine({ seed: 12345 });
await engine.start();
```
`start()` must resolve before invoking commands.

## Creating a Character
```ts
const { character } = engine.entities;
const draft = character.prepare(character.human, character.fighter, { name: 'Aela' });
const id = engine.store.setEntity('character', draft);
```

## Running a Command
```ts
const xpResult = await engine.command.gainExperience(id, { amount: 250 });
if (xpResult.ok) console.log('XP:', xpResult.data.newXp);
```
All command parameter IDs are validated with branded schemas (e.g. `characterIdSchema`); pass the ID you received from creation helpers or parsing functions.

### ID Utilities
Helpers exported for runtime boundaries:
```ts
import { parseCharacterId, tryParseCharacterId, ensureCharacterId, idKind } from '@osric';
const cid = parseCharacterId(raw);          // throws if invalid
const maybe = tryParseCharacterId(raw);     // returns CharacterId | null
const ensured = ensureCharacterId('char_abc123'); // ensures prefix, throws otherwise
console.log(idKind(cid)); // 'character'
```

### Result Shape
Command results merge the outputs of each rule. Empty-output rules contribute nothing; later rules can depend on earlier keys via `ctx.acc` internally, while you read only the final merged object.

Next: Configuration Options (2).
