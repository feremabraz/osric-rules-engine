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

Next: Configuration Options (2).
